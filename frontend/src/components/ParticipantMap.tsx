import { useEffect, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import * as d3 from "d3"
import { ParticipantMapResponse } from '../types/inference'
import type { Feature, FeatureCollection, Geometry } from "geojson"


export function ParticipantMap() {
    const apiUrl = import.meta.env.VITE_API_URL || '/api'

    const svgRef = useRef<SVGSVGElement | null>(null)
    const containerRef = useRef<HTMLDivElement | null>(null)
    const [geoData, setGeoData] = useState<FeatureCollection<Geometry> | null>(null)
    const [dimensions, setDimensions] = useState({ width: 800, height: 450 });

    const fetchParticipantsMap = async (): Promise<ParticipantMapResponse> => {
        const endpoint = `${apiUrl}/v1/participants/map`
        const response = await fetch(endpoint)
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }
        return response.json()
    }

    const { data, isLoading: loading, error: queryError, refetch } = useQuery<ParticipantMapResponse>({
        queryKey: ['participants-map'],
        queryFn: fetchParticipantsMap,
        staleTime: 60000,
        refetchInterval: 60000,
        refetchOnMount: true,
        placeholderData: (previousData) => previousData,
    })

    const error = queryError ? (queryError as Error).message : ''

    useEffect(() => {
        fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson')
            .then(res => res.json())
            .then(data => setGeoData(data))
            .catch(err => console.error("Failed to load map data", err));
    }, []);

    useEffect(() => {
        const handleResize = () => {
            if (!containerRef.current) return
            const { width } = containerRef.current.getBoundingClientRect()
            setDimensions({
                width,
                height: width * 0.52,
            })
        }

        window.addEventListener("resize", handleResize)
        setTimeout(handleResize, 50)

        return () => window.removeEventListener("resize", handleResize)
    }, [])

    useEffect(() => {
        if (!geoData || !svgRef.current || !data) return

        const svg = d3.select(svgRef.current)
        svg.selectAll("*").remove()

        const filteredGeoData: FeatureCollection<Geometry> = {
            ...geoData,
            features: geoData.features.filter(
                (f: Feature) => f.properties?.name !== "Antarctica"
            ),
        }

        const projection = d3.geoNaturalEarth1()
            .fitExtent(
                [
                    [dimensions.width * 0.02, dimensions.height * 0.03],
                    [dimensions.width * 0.98, dimensions.height * 0.97],
                ],
                filteredGeoData
            )

        const pathGenerator = d3.geoPath().projection(projection)

        svg.append("g")
            .selectAll("path")
            .data(filteredGeoData.features)
            .enter()
            .append("path")
            .attr("d", d => pathGenerator(d as any)!)
            .attr("fill", "#334155")
            .attr("stroke", "#1e293b")
            .attr("stroke-width", 0.5)

        type AggPoint = {
            lat: number
            lon: number
            count: number
            cities: Set<string>
        }

        const map = new Map<string, AggPoint>()

        data.participants.forEach(p => {
            if (
                typeof p.latitude !== "number" ||
                typeof p.longitude !== "number"
            ) return

            const key = `${p.latitude.toFixed(3)},${p.longitude.toFixed(3)}`

            if (!map.has(key)) {
                map.set(key, {
                    lat: p.latitude,
                    lon: p.longitude,
                    count: 1,
                    cities: new Set(p.city ? [p.city] : [])
                })
            } else {
                const item = map.get(key)!
                item.count += 1
                if (p.city) item.cities.add(p.city)
            }
        })

        const points = Array.from(map.values())

        const rScale = d3.scaleSqrt()
            .domain([1, d3.max(points, d => d.count) || 1])
            .range([2, 10])

        const g = svg.append("g")

        g.selectAll("circle")
            .data(points)
            .enter()
            .append("circle")
            .attr("cx", d => projection([d.lon, d.lat])?.[0] ?? -100)
            .attr("cy", d => projection([d.lon, d.lat])?.[1] ?? -100)
            .attr("r", d => rScale(d.count))
            .attr("fill", "#c9ff00")
            .attr("fill-opacity", 0.7)
            .style("mix-blend-mode", "screen")
            .style("cursor", "pointer")
            .on("mouseenter", function (_, d) {
                d3.select(this)
                    .attr("stroke", "#eaff7a")
                    .attr("stroke-width", 1.5)

                const cityList = Array.from(d.cities)

                const label =
                    cityList.length > 0
                        ? `${d.count} nodes · ${cityList.slice(0, 3).join(", ")}`
                        : `${d.count} nodes`

                const [x, y] = projection([d.lon, d.lat]) ?? [0, 0]

                svg.append("text")
                    .attr("id", "tooltip")
                    .attr("x", x + 8)
                    .attr("y", y - 8)
                    .text(label)
                    .attr("fill", "#f8fafc")
                    .attr("font-size", 12)
                    .attr("font-weight", 600)
                    .style("pointer-events", "none")
                    .style("text-shadow", "0 1px 2px #000")
            })
            .on("mouseleave", function () {
                d3.select(this).attr("stroke", "none")
                svg.select("#tooltip").remove()
            })

    }, [geoData, dimensions, data]);

    const handleRefresh = () => {
        refetch()
    }

    if (loading && !data) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-r-transparent"></div>
                    <p className="mt-4 text-gray-600">Loading Participant Map...</p>
                </div>
            </div>
        )
    }

    if (error && !data) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
                    <h2 className="text-red-800 text-lg font-semibold mb-2">Error</h2>
                    <p className="text-red-600">{error}</p>
                    <button
                        onClick={handleRefresh}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                        Retry
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">
                        Global Node Distribution
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">
                        Real-time active nodes geographic monitoring
                    </p>
                </div>

                <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#c9ff00] shadow-[0_0_10px_rgba(201,255,0,0.5)]" />
                        <span className="font-semibold text-gray-700">
                            Active ({data?.total_participant ?? 0})
                        </span>
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
                    height: dimensions.height,
                    background: "#3a3a3a",
                }}
            >
                {!geoData && (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                        Loading map…
                    </div>
                )}

                <svg
                    ref={svgRef}
                    width={dimensions.width}
                    height={dimensions.height}
                    className="block"
                />
            </div>
        </div>
    )
}