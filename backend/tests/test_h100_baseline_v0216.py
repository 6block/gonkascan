#!/usr/bin/env python3
"""
测试 H100 基准线计算 v0.2.16
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from backend.client import GonkaClient
from backend.service import InferenceService
from backend.database import CacheDB

async def test_h100_baseline():
    """测试 H100 基准线计算"""

    print("初始化客户端...")
    base_urls = os.getenv("INFERENCE_URLS", "http://node2.gonka.ai:8000").split(",")
    base_urls = [url.strip() for url in base_urls]

    client = GonkaClient(base_urls=base_urls)

    # 初始化临时数据库
    cache_db = CacheDB(":memory:")
    await cache_db.initialize()

    service = InferenceService(client, cache_db)

    # 测试 epoch 418, 419, 420
    for epoch_index in [418, 419, 420]:
        print(f"\n{'='*60}")
        print(f"测试 Epoch {epoch_index}")
        print('='*60)

        try:
            result = await service.get_h100_baseline(epoch_index)

            if "error" in result:
                print(f"✗ 错误: {result['error']}")
                continue

            print(f"✓ H100 Equivalent: {result.get('h100_equivalent')}")
            print(f"✓ Weight per H100: {result.get('weight_per_h100')}")
            print(f"✓ Total Weight: {result.get('total_weight')}")
            print(f"✓ Node Count: {result.get('node_count')}")
            print(f"✓ Card Count: {result.get('card_count')}")
            print(f"✓ Sample Count: {result.get('sample_count')}")
            print(f"✓ Mixed Hosts Included: {result.get('mixed_hosts_included')}")
            print(f"✓ Models: {', '.join(result.get('model_ids', []))}")
            print(f"✓ Sample Range: {result.get('samples_min')} - {result.get('samples_max')}")
            print(f"✓ Calculation Method: {result.get('calculation_method')}")

            # 验证期望值
            expected = {
                418: 1834,
                419: None,  # 未知
                420: 1696
            }

            if expected[epoch_index]:
                actual = result.get('h100_equivalent')
                diff = abs(actual - expected[epoch_index])
                if diff < 50:  # 允许小误差
                    print(f"✅ 匹配期望值 {expected[epoch_index]} (误差: {diff:.1f})")
                else:
                    print(f"⚠️  与期望值 {expected[epoch_index]} 不匹配 (误差: {diff:.1f})")

        except Exception as e:
            print(f"✗ 异常: {e}")
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(test_h100_baseline())
