#!/usr/bin/env python3
"""
直接测试 v0.2.16 新端点的响应
"""
import asyncio
import sys
import os
import json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from backend.client import GonkaClient

async def test_v0216_endpoints():
    """测试 v0.2.16 新端点"""

    print("初始化客户端...")
    base_urls = os.getenv("INFERENCE_URLS", "http://node2.gonka.ai:8000").split(",")
    base_urls = [url.strip() for url in base_urls]
    client = GonkaClient(base_urls=base_urls)

    # 测试 dynamic_coefficients
    print("\n" + "="*60)
    print("测试 dynamic_coefficients 端点 (Epoch 182)")
    print("="*60)
    try:
        coeffs = await client.get_dynamic_coefficients(182)
        print(f"✓ 成功获取数据")
        print(f"  模型系数数量: {len(coeffs.get('model_coefficients', []))}")
        if coeffs.get('model_coefficients'):
            print(f"  第一个模型: {json.dumps(coeffs['model_coefficients'][0], indent=2)}")
    except Exception as e:
        print(f"✗ 错误: {e}")

    # 测试 hardware_nodes_all
    print("\n" + "="*60)
    print("测试 hardware_nodes_all 端点")
    print("="*60)
    try:
        hardware = await client.get_hardware_nodes_all()
        print(f"✓ 成功获取数据")
        print(f"  硬件节点数量: {len(hardware.get('hardware_nodes', []))}")

        # 统计 H100 节点
        h100_nodes = []
        for node in hardware.get('hardware_nodes', []):
            hw_list = node.get('hardware', [])
            if 'h100_80gb_hbm3' in hw_list:
                h100_nodes.append(node)

        print(f"  包含 h100_80gb_hbm3 的节点数: {len(h100_nodes)}")

        if h100_nodes:
            print(f"\n  示例 H100 节点:")
            print(json.dumps(h100_nodes[0], indent=2))

    except Exception as e:
        print(f"✗ 错误: {e}")

if __name__ == '__main__':
    asyncio.run(test_v0216_endpoints())
