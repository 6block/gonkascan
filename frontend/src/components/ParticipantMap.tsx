import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as d3 from 'd3'
import { ParticipantMapResponse } from '../types/inference'
import { apiFetch } from '../utils'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import countries from 'i18n-iso-countries'
import enLocale from 'i18n-iso-countries/langs/en.json'
import LoadingScreen from './common/LoadingScreen'
import ErrorScreen from './common/ErrorScreen'

countries.registerLocale(enLocale)

type CountryStat = {
  code: string
  name: string
  count: number
}  

export function ParticipantMap() {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [geoData, setGeoData] = useState<FeatureCollection<Geometry> | null>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [countryStats, setCountryStats] = useState<CountryStat[]>([])

  const { data, isLoading, error, refetch } = useQuery<ParticipantMapResponse>({
    queryKey: ['participants-map'],
    queryFn: () => apiFetch('/v1/participants/map'),
    staleTime: 60000,
    refetchInterval: 60000,
    refetchOnMount: true,
    placeholderData: (previousData) => previousData,
  })

  useEffect(() => {
    fetch('/world.geojson')
      .then(res => res.json())
      .then(data => setGeoData(data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    let frameId: number
    const measure = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect()
        if (width > 0) {
          const height = width * 0.52
          setDimensions({ width, height })
          return
        }
      }
      frameId = requestAnimationFrame(measure)
    }
    
    measure()
    
    const handleWindowResize = () => {
      if (!containerRef.current) return
      const { width } = containerRef.current.getBoundingClientRect()
      if (width > 0) {
        const height = width * 0.52
        setDimensions({ width, height })
      }
    }

    window.addEventListener('resize', handleWindowResize)
    return () => {
      if (frameId) cancelAnimationFrame(frameId)
      window.removeEventListener('resize', handleWindowResize)
    }
  }, [])    

  useEffect(() => {
    if (!geoData || !svgRef.current || !data || !dimensions.width || !dimensions.height) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const countryCounts: Record<string, CountryStat> = {}
    data.participants.forEach(p => {
      if (p.country_code) {
        const codeA2 = p.country_code.trim().toUpperCase()
        const codeA3 = countries.alpha2ToAlpha3(codeA2)
        if (!codeA3) return
        if (!countryCounts[codeA3]) {
          countryCounts[codeA3] = {
            code: codeA3,
            name: p.country || codeA3,
            count: 0,
          }
        }

        countryCounts[codeA3].count += 1
      }
    })
    const sorted = Object.values(countryCounts).sort((a, b) => b.count - a.count)
    setCountryStats(sorted)

    const filteredGeoData: FeatureCollection<Geometry> = {
      ...geoData,
      features: geoData.features.filter(
        (f: Feature) => f.properties?.name !== 'Antarctica',
      ),
    }

    const projection = d3.geoNaturalEarth1()
      .fitExtent(
        [
          [dimensions.width * 0.02, dimensions.height * 0.03],
          [dimensions.width * 0.98, dimensions.height * 0.97],
        ],
        filteredGeoData,
      )

    const pathGenerator = d3.geoPath().projection(projection)

    const maxCount = d3.max(Object.values(countryCounts), d => d.count) ?? 1
    const colorScale = d3.scaleSequential()
      .domain([1, maxCount])
      .interpolator(d3.interpolateRgbBasis([
        '#134e4a',
        '#0f766e',
        '#14b8a6',
        '#5eead4',
      ]))  

    svg.append('g')
      .selectAll('path')
      .data(filteredGeoData.features)
      .enter()
      .append('path')
      .attr('d', d => pathGenerator(d)!)
      .attr('fill', d => {
        const countryId = d.id as string | undefined
        const count = countryId ? countryCounts[countryId]?.count ?? 0 : 0
        return count > 0 ? colorScale(count) : '#1f2937'
      })
      .attr('stroke', '#111827')
      .attr('stroke-width', 0.6)
      .on('mouseenter', function (_, d) {
        const countryId = d.id as string | undefined
        const count = countryId ? countryCounts[countryId]?.count ?? 0 : 0
        const countryName = d.properties?.name ?? 'Unknown'

        d3.select(this).attr('stroke', '#99f6e4').attr('stroke-width', 1.2)

        const [x, y] = pathGenerator.centroid(d)
        const g = svg.append('g').attr('id', 'tooltip').attr('pointer-events', 'none')

        const text = g.append('text')
          .attr('x', x)
          .attr('y', y - 18)
          .attr('text-anchor', 'middle')
          .attr('fill', 'white')
          .attr('font-size', 14)
          .attr('font-weight', 600)
          .text(`${countryName} ${count}`)

        const bbox = (text.node() as SVGTextElement).getBBox()
        const paddingX = 12
        const paddingY = 8

        g.insert('rect', 'text')
          .attr('x', bbox.x - paddingX)
          .attr('y', bbox.y - paddingY)
          .attr('width', bbox.width + paddingX * 2)
          .attr('height', bbox.height + paddingY * 2)
          .attr('rx', 8)
          .attr('fill', 'rgba(0,0,0,0.75)')
          .attr('stroke', '#6ee7b7')
          .attr('stroke-width', 0.5)
                
      })
      .on('mouseleave', function () {
        d3.select(this).attr('stroke', '#111827').attr('stroke-width', 0.6)
        svg.select('#tooltip').remove()
      })

  }, [geoData, dimensions, data])

  const handleRefresh = () => {
    refetch()
  }

  if (isLoading && !data) {
    return <LoadingScreen label="Loading Participant Map..." />
  }

  if (error && !data) {
    return <ErrorScreen error={error} onRetry={handleRefresh} />
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Global Node Distribution</h2>
          <p className="text-gray-500 text-sm mt-1">Real-time active nodes geographic monitoring</p>
        </div>

        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#c9ff00] shadow-[0_0_10px_rgba(201,255,0,0.5)]" />
            <span className="font-semibold text-gray-700">Active ({data?.total_participant ?? 0})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
            <span className="font-semibold text-gray-400">Offline</span>
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className="w-full rounded-lg overflow-hidden relative"
        style={{
          height: dimensions.height || 450,
          background: '#0b0f14',
        }}
      >
        {!geoData && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">Loading map…</div>
        )}

        <svg ref={svgRef} width={dimensions.width || '100%'} height={dimensions.height || 450} className="block"/>
      </div>
      <div className="mt-8 border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">Countries & Regions</h3>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left w-[50%]">REGIONS</th>
              <th className="px-4 py-3 text-center w-[50%]">COUNT</th>
            </tr>
          </thead>

          <tbody>
            {countryStats.map(c => (
              <tr key={c.code} className="border-t hover:bg-gray-50 transition">
                <td className="px-4 py-3 font-medium text-gray-800 w-[50%]">{c.name}</td>
                <td className="px-4 py-3 text-center font-semibold text-gray-900 w-[50%]">
                  <span className="inline-block min-w-[56px] rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-900">
                    {c.count.toLocaleString()}
                  </span>
                </td>
              </tr>
            ))}

            {countryStats.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-gray-400">No data</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  )
}