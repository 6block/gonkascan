#!/usr/bin/env python3
"""
测试 H100 基准线 API 端点
"""
import asyncio
import sys
import os

# 添加 backend/src 到 Python 路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from backend.client import GonkaClient
from backend.service import InferenceService
from backend.database import CacheDB

async def test_h100_baseline():
    """测试 H100 基准线计算"""

    print("初始化客户端...")
    # 使用默认的链节点 URL
    base_urls = os.getenv("INFERENCE_URLS", "http://node2.gonka.ai:8000").split(",")
    base_urls = [url.strip() for url in base_urls]

    client = GonkaClient(base_urls=base_urls)

    # 初始化临时数据库（用于测试）
    cache_db = CacheDB(":memory:")
    await cache_db.initialize()

    service = InferenceService(client, cache_db)

    # 测试最近的几个 epoch
    test_epochs = [180, 181, 182]

    for epoch_id in test_epochs:
        print(f"\n{'='*60}")
        print(f"测试 Epoch {epoch_id}")
        print('='*60)

        try:
            result = await service.get_h100_baseline(epoch_id)

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
    asyncio.run(test_h100_baseline())
