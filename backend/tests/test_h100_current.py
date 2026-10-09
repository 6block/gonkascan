#!/usr/bin/env python3
"""
测试当前 epoch 的 H100 基准线计算
"""
import asyncio
import sys
import os
import json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from backend.client import GonkaClient
from backend.service import InferenceService
from backend.database import CacheDB

async def test_current_epoch():
    """测试当前 epoch"""

    print("初始化客户端...")
    base_urls = os.getenv("INFERENCE_URLS", "http://node2.gonka.ai:8000").split(",")
    base_urls = [url.strip() for url in base_urls]

    client = GonkaClient(base_urls=base_urls)

    # 初始化临时数据库
    cache_db = CacheDB(":memory:")
    await cache_db.initialize()

    service = InferenceService(client, cache_db)

    # 测试当前 epoch
    print(f"\n{'='*60}")
    print(f"测试当前 Epoch")
    print('='*60)

    # 先获取原始数据查看
    epoch_data = await client.get_current_epoch_group_data()
    print(f"\n✓ Epoch Group Data:")
    print(f"  Epoch Index: {epoch_data.get('epoch_group_data', {}).get('epoch_index')}")

    validation_weights = epoch_data.get('validation_weights', [])
    print(f"  Validation Weights 数量: {len(validation_weights)}")

    confirmation_scales = epoch_data.get('epoch_group_data', {}).get('confirmation_weight_scales', [])
    print(f"  Confirmation Weight Scales 数量: {len(confirmation_scales)}")

    if confirmation_scales:
        print(f"\n  固定模型:")
        for scale in confirmation_scales:
            model_id = scale.get('model_id')
            config = scale.get('config', {})
            coeff_min = config.get('coeff_min', {})
            coeff_max = config.get('coeff_max', {})
            print(f"    - {model_id}")
            print(f"      coeff_min: {coeff_min}")
            print(f"      coeff_max: {coeff_max}")

    hardware_resp = await client.get_hardware_nodes_all()
    nodes = hardware_resp.get('nodes', [])
    print(f"\n  Hardware Nodes 数量: {len(nodes)}")

    # 统计硬件类型
    if nodes:
        print(f"\n  前 3 个节点的硬件信息:")
        for i, node in enumerate(nodes[:3]):
            participant = node.get('participant')
            hw_nodes = node.get('hardware_nodes', [])
            print(f"    节点 {i+1}: {participant}")
            for hw_node in hw_nodes:
                models = hw_node.get('models', [])
                hardware = hw_node.get('hardware', [])
                print(f"      模型: {models}")
                print(f"      硬件: {hardware}")

    # 现在测试计算
    print(f"\n{'='*60}")
    print(f"测试 H100 Baseline 计算")
    print('='*60)

    try:
        result = await service.get_h100_baseline(0)

        print(f"✓ H100 基准线: {result['h100_baseline']:.6f}")
        print(f"✓ 分母(中位数权重): {result['denominator']:.2f}")
        print(f"✓ 样本数: {result['sample_size']}")
        print(f"✓ 参考模型: {result['reference_model']}")
        print(f"✓ 计算方法: {result['calculation_method']}")

        if result['sample_size'] == 0:
            print("⚠️  警告: 样本数为 0")
        elif result['sample_size'] < 3:
            print(f"⚠️  警告: 样本数 < 3 ({result['sample_size']})")

    except Exception as e:
        print(f"✗ 错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(test_current_epoch())
