#!/usr/bin/env python3
"""
测试 fee 检查功能
"""
import asyncio
import sys
import os
import json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from backend.client import GonkaClient
from backend.service import InferenceService
from backend.database import CacheDB

async def test_fee_check():
    """测试费用检查功能"""

    print("初始化客户端...")
    base_urls = os.getenv("INFERENCE_URLS", "http://node2.gonka.ai:8000").split(",")
    base_urls = [url.strip() for url in base_urls]

    client = GonkaClient(base_urls=base_urls)

    # 初始化临时数据库
    cache_db = CacheDB(":memory:")
    await cache_db.initialize()

    service = InferenceService(client, cache_db)

    print(f"\n{'='*60}")
    print(f"测试 Fee 检查功能")
    print('='*60)

    try:
        result = await service.check_participant_fees()

        print(f"\n✓ Epoch Index: {result['epoch_index']}")
        print(f"✓ Current Block: {result['current_block_height']}")
        print(f"✓ Block Time: {result['current_block_time']}")
        print(f"✓ Total Participants: {result['total_participants']}")
        print(f"✓ Participants with Issues: {result['participants_with_issues']}")

        # 显示有问题的参与者
        if result['participants_with_issues'] > 0:
            print(f"\n{'='*60}")
            print(f"参与者问题详情:")
            print('='*60)

            for p in result['participants']:
                if not p['has_valid_fee_payer']:
                    print(f"\n❌ Participant: {p['participant_id']}")
                    print(f"   Cold Spendable: {int(p['cold_spendable_ngonka']) / 1e9:.2f} GNK")
                    print(f"   Cold Total: {int(p['cold_total_ngonka']) / 1e9:.2f} GNK")
                    print(f"   Cold Vesting: {int(p['cold_vesting_ngonka']) / 1e9:.2f} GNK")
                    print(f"   Fee Payers: {len(p['fee_payers'])}")

                    for payer in p['fee_payers']:
                        print(f"     - Warm: {payer['warm_address']}")
                        print(f"       Has Feegrant: {payer['has_feegrant']}")
                        if payer['has_feegrant']:
                            if payer['is_unlimited']:
                                print(f"       Allowance: Unlimited")
                            else:
                                print(f"       Remaining: {int(payer['remaining_allowance_ngonka'] or 0) / 1e9:.2f} GNK")
                            print(f"       Expired: {payer['feegrant_expired']}")
                        print(f"       Warm Spendable: {int(payer['warm_spendable_ngonka']) / 1e9:.2f} GNK")

                    print(f"   Warnings:")
                    for warning in p['warnings']:
                        print(f"     ⚠️  {warning}")
        else:
            print(f"\n✅ 所有参与者的费用配置都正常!")

        # 显示前 3 个正常的参与者作为参考
        print(f"\n{'='*60}")
        print(f"正常参与者示例 (前3个):")
        print('='*60)

        normal_count = 0
        for p in result['participants']:
            if p['has_valid_fee_payer'] and normal_count < 3:
                print(f"\n✓ Participant: {p['participant_id']}")
                print(f"  Cold Spendable: {int(p['cold_spendable_ngonka']) / 1e9:.2f} GNK")
                print(f"  Fee Payers: {len(p['fee_payers'])}")
                for payer in p['fee_payers']:
                    print(f"    - Warm: {payer['warm_address']}")
                    if payer['is_unlimited']:
                        print(f"      Allowance: Unlimited")
                    else:
                        print(f"      Remaining: {int(payer['remaining_allowance_ngonka'] or 0) / 1e9:.2f} GNK")
                normal_count += 1

    except Exception as e:
        print(f"✗ 错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(test_fee_check())
