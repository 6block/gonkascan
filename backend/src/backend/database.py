import aiosqlite
import json
from typing import List, Dict, Any, Optional
from datetime import datetime
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class CacheDB:
    def __init__(self, db_path: str = "cache.db"):
        self.db_path = db_path
        
    async def initialize(self):
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("PRAGMA journal_mode=WAL;")
            await db.execute("PRAGMA synchronous=NORMAL;")
            await db.execute("PRAGMA temp_store=MEMORY;")
            await db.execute("PRAGMA cache_size=-64000;") 

            await db.execute("""
                CREATE TABLE IF NOT EXISTS blocks (
                    height BIGINT PRIMARY KEY,
                    chain_id TEXT NOT NULL,
                    time TEXT NOT NULL,
                    last_commit_hash TEXT NOT NULL,
                    data_hash TEXT NOT NULL,
                    validators_hash TEXT NOT NULL,
                    next_validators_hash TEXT NOT NULL,
                    consensus_hash TEXT NOT NULL,
                    app_hash TEXT NOT NULL,
                    last_results_hash TEXT NOT NULL,
                    evidence_hash TEXT NOT NULL,
                    proposer_address TEXT NOT NULL,
                    block_id_hash TEXT NOT NULL,
                    block_id_parts_total INTEGER NOT NULL,
                    block_id_parts_hash TEXT NOT NULL,
                    last_block_id_hash TEXT,
                    last_block_id_parts_total INTEGER NOT NULL,
                    last_block_id_parts_hash TEXT,
                    last_commit_height BIGINT NOT NULL,
                    last_commit_round INTEGER NOT NULL,
                    last_commit_signatures_count INTEGER NOT NULL DEFAULT 0,
                    transaction_count INTEGER NOT NULL DEFAULT 0,
                    evidence_json TEXT
                )
            """)

            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_blocks_proposer ON blocks(proposer_address)
            """)

            await db.execute("""
                CREATE TABLE IF NOT EXISTS block_commit_signatures (
                    block_height BIGINT NOT NULL,
                    signature_index INTEGER NOT NULL,
                    block_id_flag TEXT NOT NULL,
                    validator_address TEXT,
                    timestamp TEXT,
                    signature TEXT,
                    PRIMARY KEY (block_height, signature_index)
                )
            """)

            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_block_commit_signatures_validator 
                ON block_commit_signatures(validator_address)
            """)

            await db.execute("""
                CREATE TABLE IF NOT EXISTS transactions (
                    hash TEXT PRIMARY KEY,
                    transaction_index INTEGER NOT NULL,
                    height BIGINT NOT NULL,
                    messages_json TEXT,
                    memo TEXT,
                    timeout_height TEXT,
                    timeout_timestamp TEXT,
                    unordered BOOLEAN,
                    extension_options_json TEXT,
                    non_critical_extension_options_json TEXT,
                    fee_amount_json TEXT,
                    gas_limit TEXT,
                    payer TEXT,
                    granter TEXT,
                    signer_infos_json TEXt,
                    signatures TEXT,
                    msg_types TEXT,
                    raw_data TEXT
                )
            """)

            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_transactions_height ON transactions(height)
            """)

            await db.execute("""
                CREATE TABLE IF NOT EXISTS transaction_participants (
                    height BIGINT NOT NULL,
                    transaction_hash TEXT NOT NULL,
                    address TEXT NOT NULL,
                    role TEXT NOT NULL,
                    FOREIGN KEY(transaction_hash) REFERENCES transactions(transaction_hash)
                )
            """)

            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_transaction_participants_height 
                ON transaction_participants(height)
            """)

            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_transaction_participants_address 
                ON transaction_participants(address)
            """)

            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_transaction_participants_role_address 
                ON transaction_participants(role, address)
            """)

            await db.execute("""
                CREATE TABLE IF NOT EXISTS block_results (
                    height BIGINT PRIMARY KEY,
                    app_hash TEXT,
                    consensus_param_updates_json TEXT,
                    finalize_block_events_json TEXT,
                    validator_updates_json TEXT
                )
            """)

            await db.execute("""
                CREATE TABLE IF NOT EXISTS transaction_results (
                    transaction_hash TEXT PRIMARY KEY,
                    height BIGINT NOT NULL,
                    code INTEGER NOT NULL,
                    codespace TEXT,
                    data TEXT,
                    gas_wanted TEXT,
                    gas_used TEXT,
                    info TEXT,
                    log TEXT,
                    FOREIGN KEY (transaction_hash) REFERENCES transactions(transaction_hash)
                )
            """)

            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_transaction_results_code ON transaction_results(code)
            """)

            await db.execute("""
                CREATE TABLE IF NOT EXISTS transaction_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    height BIGINT NOT NULL,
                    transaction_hash TEXT NOT NULL,
                    type TEXT NOT NULL,
                    key TEXT NOT NULL,
                    value TEXT,
                    indexed BOOLEAN,
                    FOREIGN KEY (transaction_hash) REFERENCES transactions(transaction_hash)
                )
            """)

            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_transaction_events_height ON transaction_events(height)
            """)

            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_transaction_events_addr ON transaction_events(value)
            """)

            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_transaction_events_type_key ON transaction_events(type, key)
            """)

            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_transaction_events_type_key_value ON transaction_events (type, key, value)
            """)

            await db.execute("""
                CREATE TABLE IF NOT EXISTS inference_stats (
                    epoch_id INTEGER NOT NULL,
                    height INTEGER NOT NULL,
                    participant_index TEXT NOT NULL,
                    stats_json TEXT NOT NULL,
                    seed_signature TEXT,
                    cached_at TEXT NOT NULL,
                    PRIMARY KEY (epoch_id, height, participant_index)
                )
            """)
            
            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_epoch_height 
                ON inference_stats(epoch_id, height)
            """)

            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_epoch_participant
                ON inference_stats(epoch_id, participant_index);
            """)
            
            await db.execute("""
                CREATE TABLE IF NOT EXISTS epoch_status (
                    epoch_id INTEGER PRIMARY KEY,
                    is_finished BOOLEAN NOT NULL,
                    finish_height INTEGER,
                    marked_at TEXT NOT NULL
                )
            """)
            
            await db.execute("""
                CREATE TABLE IF NOT EXISTS jail_status (
                    epoch_id INTEGER NOT NULL,
                    participant_index TEXT NOT NULL,
                    is_jailed BOOLEAN NOT NULL,
                    jailed_until TEXT,
                    ready_to_unjail BOOLEAN,
                    valcons_address TEXT,
                    moniker TEXT,
                    identity TEXT,
                    keybase_username TEXT,
                    keybase_picture_url TEXT,
                    website TEXT,
                    validator_consensus_key TEXT,
                    consensus_key_mismatch BOOLEAN,
                    recorded_at TEXT NOT NULL,
                    PRIMARY KEY (epoch_id, participant_index)
                )
            """)
            
            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_participant_jail 
                ON jail_status(participant_index)
            """)
            
            await db.execute("""
                CREATE TABLE IF NOT EXISTS node_health (
                    participant_index TEXT NOT NULL,
                    is_healthy BOOLEAN NOT NULL,
                    last_check TEXT NOT NULL,
                    error_message TEXT,
                    response_time_ms INTEGER,
                    PRIMARY KEY (participant_index)
                )
            """)
            
            await db.execute("""
                CREATE TABLE IF NOT EXISTS participant_rewards (
                    epoch_id INTEGER NOT NULL,
                    participant_id TEXT NOT NULL,
                    rewarded_coins TEXT NOT NULL,
                    claimed INTEGER NOT NULL,
                    last_updated TEXT NOT NULL,
                    PRIMARY KEY (epoch_id, participant_id)
                )
            """)
            
            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_participant_rewards
                ON participant_rewards(participant_id)
            """)
            
            await db.execute("""
                CREATE TABLE IF NOT EXISTS participant_warm_keys (
                    epoch_id INTEGER NOT NULL,
                    participant_id TEXT NOT NULL,
                    grantee_address TEXT NOT NULL,
                    granted_at TEXT NOT NULL,
                    last_updated TEXT NOT NULL,
                    PRIMARY KEY (epoch_id, participant_id, grantee_address)
                )
            """)
            
            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_warm_keys_participant
                ON participant_warm_keys(epoch_id, participant_id)
            """)
            
            await db.execute("""
                CREATE TABLE IF NOT EXISTS participant_hardware_nodes (
                    epoch_id INTEGER NOT NULL,
                    participant_id TEXT NOT NULL,
                    local_id TEXT NOT NULL,
                    status TEXT NOT NULL,
                    models_json TEXT NOT NULL,
                    hardware_json TEXT NOT NULL,
                    host TEXT NOT NULL,
                    port TEXT NOT NULL,
                    poc_weight INTEGER,
                    last_updated TEXT NOT NULL,
                    PRIMARY KEY (epoch_id, participant_id, local_id)
                )
            """)
            
            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_hardware_nodes_participant
                ON participant_hardware_nodes(epoch_id, participant_id)
            """)
            
            await db.execute("""
                CREATE TABLE IF NOT EXISTS epoch_total_rewards (
                    epoch_id INTEGER PRIMARY KEY,
                    total_rewards_gnk INTEGER NOT NULL,
                    calculated_at TEXT NOT NULL
                )
            """)
            
            await db.execute("""
                CREATE TABLE IF NOT EXISTS models (
                    epoch_id INTEGER NOT NULL,
                    model_id TEXT NOT NULL,
                    total_weight INTEGER NOT NULL,
                    participant_count INTEGER NOT NULL,
                    cached_at TEXT NOT NULL,
                    PRIMARY KEY (epoch_id, model_id)
                )
            """)
            
            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_models_epoch
                ON models(epoch_id)
            """)
            
            await db.execute("""
                CREATE TABLE IF NOT EXISTS models_api_cache (
                    epoch_id INTEGER NOT NULL,
                    height INTEGER NOT NULL,
                    models_all_json TEXT NOT NULL,
                    models_stats_json TEXT NOT NULL,
                    cached_at TEXT NOT NULL,
                    PRIMARY KEY (epoch_id, height)
                )
            """)
            
            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_models_api_epoch
                ON models_api_cache(epoch_id)
            """)
            
            await db.execute("""
                CREATE TABLE IF NOT EXISTS participant_inferences (
                    epoch_id INTEGER NOT NULL,
                    participant_id TEXT NOT NULL,
                    inference_id TEXT NOT NULL,
                    status TEXT NOT NULL,
                    start_block_height TEXT NOT NULL,
                    start_block_timestamp TEXT NOT NULL,
                    validated_by_json TEXT,
                    prompt_hash TEXT,
                    response_hash TEXT,
                    prompt_payload TEXT,
                    response_payload TEXT,
                    prompt_token_count TEXT,
                    completion_token_count TEXT,
                    model TEXT,
                    last_updated TEXT NOT NULL,
                    PRIMARY KEY (epoch_id, participant_id, inference_id)
                )
            """)
            
            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_participant_inferences
                ON participant_inferences(epoch_id, participant_id, status)
            """)

            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_participant_inferences_model_epoch
                ON participant_inferences(model, epoch_id);
            """)
            
            await db.execute("""
                CREATE TABLE IF NOT EXISTS timeline_cache (
                    id INTEGER PRIMARY KEY,
                    timeline_json TEXT NOT NULL,
                    cached_at TEXT NOT NULL
                )
            """)
            
            await db.execute("""
                CREATE TABLE IF NOT EXISTS confirmation_data (
                    epoch_id INTEGER NOT NULL,
                    participant_index TEXT NOT NULL,
                    weight_to_confirm INTEGER,
                    confirmation_weight INTEGER,
                    confirmation_poc_ratio REAL,
                    participant_status TEXT,
                    recorded_at TEXT NOT NULL,
                    PRIMARY KEY (epoch_id, participant_index)
                )
            """)
            
            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_confirmation_participant 
                ON confirmation_data(participant_index)
            """)

            await db.execute("""
                CREATE TABLE IF NOT EXISTS transactions_old (
                    height INTEGER NOT NULL,
                    tx_hash TEXT NOT NULL,
                    messages TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    PRIMARY KEY (tx_hash)
                )
            """)

            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_transactions_height
                ON transactions_old(height)
            """)

            await db.execute("""
                CREATE TABLE IF NOT EXISTS participant_node_geo (
                    participant_index TEXT PRIMARY KEY,
                    inference_url TEXT NOT NULL,
                    ip TEXT NOT NULL,
                    country_code TEXT,
                    country TEXT,
                    region TEXT,
                    city TEXT,
                    latitude REAL,
                    longitude REAL,
                    last_updated TEXT NOT NULL
                );
            """)

            await db.execute("""
                CREATE TABLE IF NOT EXISTS epoch_participants_snapshot (
                    epoch_id INTEGER PRIMARY KEY,
                    effective_block_height INTEGER NOT NULL,
                    poc_start_block_height INTEGER,
                    created_at_block_height INTEGER,
                    participant_count INTEGER,
                    validator_count INTEGER,
                    snapshot_json TEXT NOT NULL,
                    fetched_from TEXT,
                    fetched_at TEXT NOT NULL
                )
            """)

            await db.execute("""
                CREATE TABLE IF NOT EXISTS gov_proposals (
                    id INTEGER PRIMARY KEY,
                    status TEXT NOT NULL,
                    code INTEGER NOT NULL,
                    metadata TEXT,
                    title TEXT,
                    summary TEXT,
                    proposer TEXT NOT NULL,
                    expedited INTEGER,
                    failed_reason TEXT,
                    submit_time TEXT NOT NULL,
                    deposit_end_time TEXT NOT NULL,
                    voting_start_time TEXT NOT NULL,
                    voting_end_time TEXT NOT NULL,
                    yes_count TEXT NOT NULL,
                    abstain_count TEXT NOT NULL,
                    no_count TEXT NOT NULL,
                    no_with_veto_count TEXT NOT NULL,
                    quorum TEXT NOT NULL,
                    threshold TEXT NOT NULL,
                    veto_threshold TEXT NOT NULL,
                    epoch_id INTEGER NOT NULL,
                    voting_start_height INTEGER NOT NULL,
                    total_weight INTEGER NOT NULL,
                    voted_weight INTEGER NOT NULL,
                    total_voters INTEGER NOT NULL,
                    total_participants INTEGER NOT NULL,
                    total_vote_txs INTEGER NOT NULL,
                    total_submit_txs INTEGER NOT NULL,
                    total_deposit_txs INTEGER NOT NULL,
                    total_deposit_json TEXT NOT NULL,
                    messages_json TEXT NOT NULL
                )
            """)

            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_gov_proposals_code
                ON gov_proposals(code)
            """)

            await db.execute("""
                CREATE TABLE IF NOT EXISTS params_snapshot (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    height          INTEGER NOT NULL,
                    proposal_id     INTEGER,
                    module          TEXT NOT NULL,
                    params_json     TEXT NOT NULL,
                    UNIQUE(height, module)
                );
            """)
            
            await db.commit()
            logger.info(f"Database initialized at {self.db_path}")
    
    async def save_stats(
        self,
        epoch_id: int,
        height: int,
        participant_index: str,
        stats: Dict[str, Any],
        seed_signature: Optional[str] = None
    ):
        cached_at = datetime.utcnow().isoformat()
        stats_json = json.dumps(stats)
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT OR REPLACE INTO inference_stats 
                (epoch_id, height, participant_index, stats_json, seed_signature, cached_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (epoch_id, height, participant_index, stats_json, seed_signature, cached_at))
            await db.commit()
    
    async def save_stats_batch(
        self,
        epoch_id: int,
        height: int,
        participants_stats: List[Dict[str, Any]]
    ):
        cached_at = datetime.utcnow().isoformat()
        
        async with aiosqlite.connect(self.db_path) as db:
            for stats in participants_stats:
                participant_index = stats.get("index")
                seed_signature = stats.get("seed_signature")
                stats_json = json.dumps(stats)
                
                await db.execute("""
                    INSERT OR REPLACE INTO inference_stats 
                    (epoch_id, height, participant_index, stats_json, seed_signature, cached_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (epoch_id, height, participant_index, stats_json, seed_signature, cached_at))
            
            await db.commit()
            logger.info(f"Saved {len(participants_stats)} stats for epoch {epoch_id} at height {height}")
    
    async def get_stats(self, epoch_id: int, height: Optional[int] = None) -> Optional[List[Dict[str, Any]]]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            
            if height is not None:
                query = """
                    SELECT participant_index, stats_json, seed_signature, height, cached_at
                    FROM inference_stats
                    WHERE epoch_id = ? AND height = ?
                """
                params = (epoch_id, height)
            else:
                query = """
                    SELECT s.participant_index, s.stats_json, s.seed_signature, s.height, s.cached_at
                    FROM inference_stats s
                    JOIN (
                        SELECT participant_index, MAX(height) AS max_height FROM inference_stats
                        WHERE epoch_id = ? GROUP BY participant_index
                    ) latest
                    ON s.participant_index = latest.participant_index
                    AND s.height = latest.max_height
                    WHERE s.epoch_id = ?
                """
                params = (epoch_id, epoch_id)
            
            async with db.execute(query, params) as cursor:
                rows = await cursor.fetchall()
                
                if not rows:
                    return None
                
                results = []
                for row in rows:
                    stats = json.loads(row["stats_json"])
                    stats["_cached_at"] = row["cached_at"]
                    stats["_height"] = row["height"]
                    stats["_seed_signature"] = row["seed_signature"]
                    results.append(stats)
                
                return results

    async def get_participant_stats(self, participant_index: str, epoch_id: int, height: Optional[int] = None) -> Optional[Dict[str, Any]]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row

            if height is not None:
                query = """
                    SELECT participant_index, stats_json, seed_signature, height, cached_at
                    FROM inference_stats
                    WHERE epoch_id = ? AND participant_index = ? AND height = ?
                    LIMIT 1
                """
                params = (epoch_id, participant_index, height)
            else:
                query = """
                    SELECT participant_index, stats_json, seed_signature, height, cached_at
                    FROM inference_stats
                    WHERE epoch_id = ? AND participant_index = ?
                    ORDER BY height DESC
                    LIMIT 1
                """
                params = (epoch_id, participant_index)

            async with db.execute(query, params) as cursor:
                row = await cursor.fetchone()
                if not row:
                    return None

                stats = json.loads(row["stats_json"])
                stats["_cached_at"] = row["cached_at"]
                stats["_height"] = row["height"]
                stats["_seed_signature"] = row["seed_signature"]
                return [stats]
    
    async def has_participant_in_epoch(self, epoch_id: int, participant_index: str) -> bool:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT 1 FROM inference_stats WHERE epoch_id = ? AND participant_index = ? LIMIT 1
            """, (epoch_id, participant_index)) as cursor:
                row = await cursor.fetchone()
                return row is not None
    
    async def has_stats_for_epoch(self, epoch_id: int, height: Optional[int] = None) -> bool:
        async with aiosqlite.connect(self.db_path) as db:
            if height is not None:
                query = "SELECT COUNT(*) as count FROM inference_stats WHERE epoch_id = ? AND height = ?"
                params = (epoch_id, height)
            else:
                query = "SELECT COUNT(*) as count FROM inference_stats WHERE epoch_id = ?"
                params = (epoch_id,)
            
            async with db.execute(query, params) as cursor:
                row = await cursor.fetchone()
                return row[0] > 0
    
    async def mark_epoch_finished(self, epoch_id: int, finish_height: int):
        marked_at = datetime.utcnow().isoformat()
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT OR REPLACE INTO epoch_status 
                (epoch_id, is_finished, finish_height, marked_at)
                VALUES (?, ?, ?, ?)
            """, (epoch_id, True, finish_height, marked_at))
            await db.commit()
            logger.info(f"Marked epoch {epoch_id} as finished at height {finish_height}")
    
    async def is_epoch_finished(self, epoch_id: int) -> bool:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT is_finished FROM epoch_status WHERE epoch_id = ?
            """, (epoch_id,)) as cursor:
                row = await cursor.fetchone()
                return row["is_finished"] if row else False
    
    async def get_epoch_finish_height(self, epoch_id: int) -> Optional[int]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT finish_height FROM epoch_status WHERE epoch_id = ?
            """, (epoch_id,)) as cursor:
                row = await cursor.fetchone()
                return row["finish_height"] if row else None
    
    async def clear_epoch_stats(self, epoch_id: int):
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("DELETE FROM inference_stats WHERE epoch_id = ?", (epoch_id,))
            await db.execute("DELETE FROM epoch_status WHERE epoch_id = ?", (epoch_id,))
            await db.commit()
    
    async def get_all_epoch_status(self):
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT epoch_id, is_finished, finish_height, marked_at FROM epoch_status ORDER BY epoch_id ASC
            """) as cursor:
                return await cursor.fetchall()

    async def get_epoch_by_height(self, height: int):
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT epoch_id FROM epoch_status WHERE finish_height >= :height ORDER BY finish_height ASC LIMIT 1;
            """, (height,)) as cursor:
                row = await cursor.fetchone()
                return row["epoch_id"] if row else None
    
    async def save_jail_status_batch(
        self,
        epoch_id: int,
        jail_statuses: List[Dict[str, Any]]
    ):
        recorded_at = datetime.utcnow().isoformat()
        
        async with aiosqlite.connect(self.db_path) as db:
            for status in jail_statuses:
                await db.execute("""
                    INSERT OR REPLACE INTO jail_status 
                    (epoch_id, participant_index, is_jailed, jailed_until, ready_to_unjail, valcons_address, 
                     moniker, identity, keybase_username, keybase_picture_url, website, 
                     validator_consensus_key, consensus_key_mismatch, recorded_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    epoch_id,
                    status.get("participant_index"),
                    status.get("is_jailed", False),
                    status.get("jailed_until"),
                    status.get("ready_to_unjail", False),
                    status.get("valcons_address"),
                    status.get("moniker"),
                    status.get("identity"),
                    status.get("keybase_username"),
                    status.get("keybase_picture_url"),
                    status.get("website"),
                    status.get("validator_consensus_key"),
                    status.get("consensus_key_mismatch"),
                    recorded_at
                ))
            
            await db.commit()
            logger.info(f"Saved {len(jail_statuses)} jail statuses for epoch {epoch_id}")
    
    async def get_jail_status(self, epoch_id: int, participant_index: Optional[str] = None) -> Optional[List[Dict[str, Any]]]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            
            if participant_index:
                query = """
                    SELECT * FROM jail_status
                    WHERE epoch_id = ? AND participant_index = ?
                """
                params = (epoch_id, participant_index)
            else:
                query = """
                    SELECT * FROM jail_status
                    WHERE epoch_id = ?
                """
                params = (epoch_id,)
            
            async with db.execute(query, params) as cursor:
                rows = await cursor.fetchall()
                
                if not rows:
                    return None
                
                results = []
                for row in rows:
                    row_dict = dict(row)
                    results.append({
                        "epoch_id": row_dict["epoch_id"],
                        "participant_index": row_dict["participant_index"],
                        "is_jailed": bool(row_dict["is_jailed"]),
                        "jailed_until": row_dict["jailed_until"],
                        "ready_to_unjail": bool(row_dict["ready_to_unjail"]) if row_dict["ready_to_unjail"] is not None else None,
                        "valcons_address": row_dict["valcons_address"],
                        "moniker": row_dict.get("moniker"),
                        "identity": row_dict.get("identity"),
                        "keybase_username": row_dict.get("keybase_username"),
                        "keybase_picture_url": row_dict.get("keybase_picture_url"),
                        "website": row_dict.get("website"),
                        "validator_consensus_key": row_dict.get("validator_consensus_key"),
                        "consensus_key_mismatch": bool(row_dict.get("consensus_key_mismatch")) if row_dict.get("consensus_key_mismatch") is not None else None,
                        "recorded_at": row_dict["recorded_at"]
                    })
                
                return results
    
    async def save_node_health_batch(
        self,
        health_statuses: List[Dict[str, Any]]
    ):
        last_check = datetime.utcnow().isoformat()
        
        async with aiosqlite.connect(self.db_path) as db:
            for status in health_statuses:
                await db.execute("""
                    INSERT OR REPLACE INTO node_health 
                    (participant_index, is_healthy, last_check, error_message, response_time_ms)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    status.get("participant_index"),
                    status.get("is_healthy", False),
                    last_check,
                    status.get("error_message"),
                    status.get("response_time_ms")
                ))
            
            await db.commit()
            logger.info(f"Saved {len(health_statuses)} node health statuses")
    
    async def get_node_health(self, participant_index: Optional[str] = None) -> Optional[List[Dict[str, Any]]]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            
            if participant_index:
                query = "SELECT * FROM node_health WHERE participant_index = ?"
                params = (participant_index,)
            else:
                query = "SELECT * FROM node_health"
                params = ()
            
            async with db.execute(query, params) as cursor:
                rows = await cursor.fetchall()
                
                if not rows:
                    return None
                
                results = []
                for row in rows:
                    results.append({
                        "participant_index": row["participant_index"],
                        "is_healthy": bool(row["is_healthy"]),
                        "last_check": row["last_check"],
                        "error_message": row["error_message"],
                        "response_time_ms": row["response_time_ms"]
                    })
                
                return results
    
    async def save_reward_batch(
        self,
        rewards: List[Dict[str, Any]]
    ):
        last_updated = datetime.utcnow().isoformat()
        
        async with aiosqlite.connect(self.db_path) as db:
            for reward in rewards:
                await db.execute("""
                    INSERT OR REPLACE INTO participant_rewards 
                    (epoch_id, participant_id, rewarded_coins, claimed, last_updated)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    reward.get("epoch_id"),
                    reward.get("participant_id"),
                    reward.get("rewarded_coins", "0"),
                    1 if reward.get("claimed") else 0,
                    last_updated
                ))
            
            await db.commit()
            logger.info(f"Saved {len(rewards)} rewards")
    
    async def get_reward(self, epoch_id: int, participant_id: str) -> Optional[Dict[str, Any]]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            
            async with db.execute("""
                SELECT * FROM participant_rewards
                WHERE epoch_id = ? AND participant_id = ?
            """, (epoch_id, participant_id)) as cursor:
                row = await cursor.fetchone()
                
                if not row:
                    return None
                
                return {
                    "epoch_id": row["epoch_id"],
                    "participant_id": row["participant_id"],
                    "rewarded_coins": row["rewarded_coins"],
                    "claimed": bool(row["claimed"]),
                    "last_updated": row["last_updated"]
                }
    
    async def get_rewards_for_participant(
        self,
        participant_id: str,
        epoch_ids: List[int]
    ) -> List[Dict[str, Any]]:
        if not epoch_ids:
            return []
        
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            
            placeholders = ",".join("?" * len(epoch_ids))
            query = f"""
                SELECT * FROM participant_rewards
                WHERE participant_id = ? AND epoch_id IN ({placeholders})
                ORDER BY epoch_id DESC
            """
            params = [participant_id] + epoch_ids
            
            async with db.execute(query, params) as cursor:
                rows = await cursor.fetchall()
                
                results = []
                for row in rows:
                    results.append({
                        "epoch_id": row["epoch_id"],
                        "participant_id": row["participant_id"],
                        "rewarded_coins": row["rewarded_coins"],
                        "claimed": bool(row["claimed"]),
                        "last_updated": row["last_updated"]
                    })
                
                return results
    
    async def save_warm_keys_batch(
        self,
        epoch_id: int,
        participant_id: str,
        warm_keys: List[Dict[str, Any]]
    ):
        last_updated = datetime.utcnow().isoformat()
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                DELETE FROM participant_warm_keys
                WHERE epoch_id = ? AND participant_id = ?
            """, (epoch_id, participant_id))
            
            for warm_key in warm_keys:
                await db.execute("""
                    INSERT INTO participant_warm_keys 
                    (epoch_id, participant_id, grantee_address, granted_at, last_updated)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    epoch_id,
                    participant_id,
                    warm_key.get("grantee_address"),
                    warm_key.get("granted_at"),
                    last_updated
                ))
            
            await db.commit()
            logger.info(f"Saved {len(warm_keys)} warm keys for participant {participant_id} in epoch {epoch_id}")
    
    async def get_warm_keys(
        self,
        epoch_id: int,
        participant_id: str
    ) -> Optional[List[Dict[str, Any]]]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            
            async with db.execute("""
                SELECT grantee_address, granted_at
                FROM participant_warm_keys
                WHERE epoch_id = ? AND participant_id = ?
                ORDER BY granted_at DESC
            """, (epoch_id, participant_id)) as cursor:
                rows = await cursor.fetchall()
                
                if not rows:
                    return None
                
                results = []
                for row in rows:
                    results.append({
                        "grantee_address": row["grantee_address"],
                        "granted_at": row["granted_at"]
                    })
                
                return results
    
    async def save_hardware_nodes_batch(
        self,
        epoch_id: int,
        participant_id: str,
        hardware_nodes: List[Dict[str, Any]]
    ):
        last_updated = datetime.utcnow().isoformat()
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                DELETE FROM participant_hardware_nodes
                WHERE epoch_id = ? AND participant_id = ?
            """, (epoch_id, participant_id))
            
            for node in hardware_nodes:
                models_json = json.dumps(node.get("models", []))
                hardware_json = json.dumps(node.get("hardware", []))
                
                await db.execute("""
                    INSERT INTO participant_hardware_nodes 
                    (epoch_id, participant_id, local_id, status, models_json, hardware_json, host, port, poc_weight, last_updated)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    epoch_id,
                    participant_id,
                    node.get("local_id", ""),
                    node.get("status", ""),
                    models_json,
                    hardware_json,
                    node.get("host", ""),
                    node.get("port", ""),
                    node.get("poc_weight"),
                    last_updated
                ))
            
            await db.commit()
            logger.info(f"Saved {len(hardware_nodes)} hardware nodes for participant {participant_id} in epoch {epoch_id}")
    
    async def get_hardware_nodes(
        self,
        epoch_id: int,
        participant_id: str
    ) -> Optional[List[Dict[str, Any]]]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            
            async with db.execute("""
                SELECT local_id, status, models_json, hardware_json, host, port, poc_weight
                FROM participant_hardware_nodes
                WHERE epoch_id = ? AND participant_id = ?
                ORDER BY local_id ASC
            """, (epoch_id, participant_id)) as cursor:
                rows = await cursor.fetchall()
                
                if not rows:
                    return None
                
                results = []
                for row in rows:
                    results.append({
                        "local_id": row["local_id"],
                        "status": row["status"],
                        "models": json.loads(row["models_json"]),
                        "hardware": json.loads(row["hardware_json"]),
                        "host": row["host"],
                        "port": row["port"],
                        "poc_weight": row["poc_weight"]
                    })
                
                return results
    
    async def save_epoch_total_rewards(
        self,
        epoch_id: int,
        total_rewards_gnk: int
    ):
        calculated_at = datetime.utcnow().isoformat()
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT OR REPLACE INTO epoch_total_rewards 
                (epoch_id, total_rewards_gnk, calculated_at)
                VALUES (?, ?, ?)
            """, (epoch_id, total_rewards_gnk, calculated_at))
            await db.commit()
            logger.info(f"Saved total rewards {total_rewards_gnk} GNK for epoch {epoch_id}")
    
    async def get_epoch_total_rewards(
        self,
        epoch_id: int
    ) -> Optional[int]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            
            async with db.execute("""
                SELECT total_rewards_gnk
                FROM epoch_total_rewards
                WHERE epoch_id = ?
            """, (epoch_id,)) as cursor:
                row = await cursor.fetchone()
                
                if not row:
                    return None
                
                return row["total_rewards_gnk"]
    
    async def delete_epoch_total_rewards(
        self,
        epoch_id: int
    ):
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                DELETE FROM epoch_total_rewards
                WHERE epoch_id = ?
            """, (epoch_id,))
            await db.commit()
            logger.info(f"Deleted total rewards cache for epoch {epoch_id}")
    
    async def save_models_batch(
        self,
        epoch_id: int,
        models_data: List[Dict[str, Any]]
    ):
        cached_at = datetime.utcnow().isoformat()
        
        async with aiosqlite.connect(self.db_path) as db:
            for model in models_data:
                model_id = model.get("model_id")
                total_weight = model.get("total_weight", 0)
                participant_count = model.get("participant_count", 0)
                
                await db.execute("""
                    INSERT OR REPLACE INTO models 
                    (epoch_id, model_id, total_weight, participant_count, cached_at)
                    VALUES (?, ?, ?, ?, ?)
                """, (epoch_id, model_id, total_weight, participant_count, cached_at))
            
            await db.commit()
            logger.info(f"Saved {len(models_data)} models for epoch {epoch_id}")
    
    async def get_models(
        self,
        epoch_id: int
    ) -> Optional[List[Dict[str, Any]]]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            
            async with db.execute("""
                SELECT model_id, total_weight, participant_count, cached_at
                FROM models
                WHERE epoch_id = ?
            """, (epoch_id,)) as cursor:
                rows = await cursor.fetchall()
                
                if not rows:
                    return None
                
                results = []
                for row in rows:
                    results.append({
                        "model_id": row["model_id"],
                        "total_weight": row["total_weight"],
                        "participant_count": row["participant_count"],
                        "cached_at": row["cached_at"]
                    })
                
                return results
    
    async def save_participant_inferences_batch(
        self,
        epoch_id: int,
        participant_id: str,
        inferences: List[Dict[str, Any]]
    ):
        last_updated = datetime.utcnow().isoformat()
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                DELETE FROM participant_inferences
                WHERE epoch_id = ? AND participant_id = ?
            """, (epoch_id, participant_id))
            
            if len(inferences) == 0:
                await db.execute("""
                    INSERT INTO participant_inferences 
                    (epoch_id, participant_id, inference_id, status, start_block_height, 
                     start_block_timestamp, validated_by_json, prompt_hash, response_hash,
                     prompt_payload, response_payload, prompt_token_count, 
                     completion_token_count, model, last_updated)
                    VALUES (?, ?, NULL, '_EMPTY_MARKER_', '0', '0', '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, ?)
                """, (epoch_id, participant_id, last_updated))
            else:
                for inference in inferences:
                    validated_by_json = json.dumps(inference.get("validated_by", []))
                    
                    await db.execute("""
                        INSERT INTO participant_inferences 
                        (epoch_id, participant_id, inference_id, status, start_block_height, 
                         start_block_timestamp, validated_by_json, prompt_hash, response_hash,
                         prompt_payload, response_payload, prompt_token_count, 
                         completion_token_count, model, last_updated)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        epoch_id,
                        participant_id,
                        inference.get("inference_id"),
                        inference.get("status"),
                        inference.get("start_block_height"),
                        inference.get("start_block_timestamp"),
                        validated_by_json,
                        inference.get("prompt_hash"),
                        inference.get("response_hash"),
                        inference.get("prompt_payload"),
                        inference.get("response_payload"),
                        inference.get("prompt_token_count"),
                        inference.get("completion_token_count"),
                        inference.get("model"),
                        last_updated
                    ))
            
            await db.commit()
            logger.info(f"Saved {len(inferences)} inferences for participant {participant_id} in epoch {epoch_id}")
    
    async def get_participant_inferences(
        self,
        epoch_id: int,
        participant_id: str
    ) -> Optional[List[Dict[str, Any]]]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            
            logger.debug(f"Querying inferences for participant {participant_id} in epoch {epoch_id}")
            
            async with db.execute("""
                SELECT inference_id, status, start_block_height, start_block_timestamp,
                       validated_by_json, prompt_hash, response_hash, prompt_payload,
                       response_payload, prompt_token_count, completion_token_count, model
                FROM participant_inferences
                WHERE epoch_id = ? AND participant_id = ?
                ORDER BY start_block_timestamp DESC
            """, (epoch_id, participant_id)) as cursor:
                rows = await cursor.fetchall()
                
                logger.debug(f"Found {len(rows)} rows for participant {participant_id} in epoch {epoch_id}")
                
                if not rows:
                    logger.debug(f"No rows found, returning None")
                    return None
                
                has_marker = any(row["status"] == "_EMPTY_MARKER_" for row in rows)
                
                results = []
                for row in rows:
                    try:
                        if row["status"] == "_EMPTY_MARKER_":
                            continue
                        
                        validated_by = []
                        if row["validated_by_json"]:
                            try:
                                validated_by = json.loads(row["validated_by_json"])
                            except json.JSONDecodeError as e:
                                logger.warning(f"Invalid JSON in validated_by for inference {row['inference_id']}: {e}")
                        
                        results.append({
                            "inference_id": row["inference_id"],
                            "status": row["status"],
                            "start_block_height": row["start_block_height"],
                            "start_block_timestamp": row["start_block_timestamp"],
                            "validated_by": validated_by,
                            "prompt_hash": row["prompt_hash"],
                            "response_hash": row["response_hash"],
                            "prompt_payload": row["prompt_payload"],
                            "response_payload": row["response_payload"],
                            "prompt_token_count": row["prompt_token_count"],
                            "completion_token_count": row["completion_token_count"],
                            "model": row["model"]
                        })
                    except Exception as e:
                        logger.warning(f"Failed to parse inference record {row.get('inference_id', 'unknown')}: {e}")
                        continue
                
                if has_marker and not results:
                    return []
                
                return results if results else None
    
    async def save_models_api_cache(
        self,
        epoch_id: int,
        height: int,
        models_all: Dict[str, Any],
        models_stats: Dict[str, Any]
    ):
        cached_at = datetime.utcnow().isoformat()
        models_all_json = json.dumps(models_all)
        models_stats_json = json.dumps(models_stats)
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT OR REPLACE INTO models_api_cache 
                (epoch_id, height, models_all_json, models_stats_json, cached_at)
                VALUES (?, ?, ?, ?, ?)
            """, (epoch_id, height, models_all_json, models_stats_json, cached_at))
            await db.commit()
            logger.info(f"Cached models API data for epoch {epoch_id} at height {height}")
    
    async def get_models_api_cache(
        self,
        epoch_id: int,
        height: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            
            if height is not None:
                query = """
                    SELECT models_all_json, models_stats_json, cached_at, height
                    FROM models_api_cache
                    WHERE epoch_id = ? AND height = ?
                """
                params = (epoch_id, height)
            else:
                query = """
                    SELECT models_all_json, models_stats_json, cached_at, height
                    FROM models_api_cache
                    WHERE epoch_id = ?
                    ORDER BY height DESC
                    LIMIT 1
                """
                params = (epoch_id,)
            
            async with db.execute(query, params) as cursor:
                row = await cursor.fetchone()
                
                if not row:
                    return None
                
                return {
                    "models_all": json.loads(row["models_all_json"]),
                    "models_stats": json.loads(row["models_stats_json"]),
                    "cached_at": row["cached_at"],
                    "cached_height": row["height"]
                }
    
    async def save_timeline_cache(self, timeline_data: Dict[str, Any]):
        cached_at = datetime.utcnow().isoformat()
        timeline_json = json.dumps(timeline_data)
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("DELETE FROM timeline_cache")
            await db.execute("""
                INSERT INTO timeline_cache (id, timeline_json, cached_at)
                VALUES (1, ?, ?)
            """, (timeline_json, cached_at))
            await db.commit()
            logger.info("Cached timeline data")
    
    async def get_timeline_cache(self) -> Optional[Dict[str, Any]]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            
            async with db.execute("""
                SELECT timeline_json, cached_at
                FROM timeline_cache
                WHERE id = 1
            """) as cursor:
                row = await cursor.fetchone()
                
                if not row:
                    return None
                
                return {
                    "timeline": json.loads(row["timeline_json"]),
                    "cached_at": row["cached_at"]
                }
    
    async def save_confirmation_data_batch(self, epoch_id: int, data_list: List[Dict[str, Any]]):
        async with aiosqlite.connect(self.db_path) as db:
            now = datetime.utcnow().isoformat()
            
            for data in data_list:
                await db.execute("""
                    INSERT OR REPLACE INTO confirmation_data 
                    (epoch_id, participant_index, weight_to_confirm, confirmation_weight, 
                     confirmation_poc_ratio, participant_status, recorded_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    epoch_id,
                    data["participant_index"],
                    data["weight_to_confirm"],
                    data["confirmation_weight"],
                    data["confirmation_poc_ratio"],
                    data["participant_status"],
                    now
                ))
            
            await db.commit()
            logger.info(f"Saved confirmation data for {len(data_list)} participants in epoch {epoch_id}")
    
    async def get_confirmation_data(self, epoch_id: int) -> Optional[List[Dict[str, Any]]]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            
            async with db.execute("""
                SELECT participant_index, weight_to_confirm, confirmation_weight,
                       confirmation_poc_ratio, participant_status
                FROM confirmation_data
                WHERE epoch_id = ?
            """, (epoch_id,)) as cursor:
                rows = await cursor.fetchall()
                
                if not rows:
                    return None
                
                return [dict(row) for row in rows]

    async def save_transactions_batch(self, tx_list: List[Dict[str, Any]]):
        async with aiosqlite.connect(self.db_path) as db:
            for tx in tx_list:
                await db.execute("""
                    INSERT OR REPLACE INTO transactions_old
                    (height, tx_hash, messages, timestamp)
                    VALUES (?, ?, ?, ?)
                """, (
                    tx["height"],
                    tx["tx_hash"],
                    json.dumps(tx["messages"]),
                    tx["timestamp"]
                ))
        
            await db.commit()
            logger.info(f"Saved transactions data for {len(tx_list)}")

    async def get_latest_tx_height(self) -> int:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""SELECT MAX(height) AS max_height FROM transactions_old;""") as cursor:
                row = await cursor.fetchone()
                if row is None or row["max_height"] is None:
                    return 0
                return int(row["max_height"])

    async def _save_blocks_batch(self, db, blocks: list[dict]):
        await db.executemany("""
            INSERT OR REPLACE INTO blocks (
                height, chain_id, time, last_commit_hash, data_hash, validators_hash, next_validators_hash, 
                consensus_hash, app_hash, last_results_hash, evidence_hash, proposer_address,
                block_id_hash, block_id_parts_total, block_id_parts_hash,
                last_block_id_hash, last_block_id_parts_total, last_block_id_parts_hash,
                last_commit_height, last_commit_round, last_commit_signatures_count, 
                transaction_count, evidence_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, [
            (
                int(block["header"]["height"]),
                block["header"]["chain_id"],
                block["header"]["time"],
                block["header"]["last_commit_hash"],
                block["header"]["data_hash"],
                block["header"]["validators_hash"],
                block["header"]["next_validators_hash"],
                block["header"]["consensus_hash"],
                block["header"]["app_hash"],
                block["header"]["last_results_hash"],
                block["header"]["evidence_hash"],
                block["header"]["proposer_address"],
                block["block_id"]["hash"],
                block["block_id"]["parts"]["total"],
                block["block_id"]["parts"]["hash"],
                block["header"]["last_block_id"]["hash"],
                block["header"]["last_block_id"]["parts"]["total"],
                block["header"]["last_block_id"]["parts"]["hash"], 
                int(block["last_commit"]["height"]),
                block["last_commit"]["round"],
                len(block["last_commit"]["signatures"]),
                len(block["data"]["txs"]),
                json.dumps(block.get("evidence", {}).get("evidence", []))
            )
            for block in blocks
        ])

    async def _save_block_commit_signatures_batch(self, db, signatures: list[dict]):
        await db.executemany("""
            INSERT OR REPLACE INTO block_commit_signatures (
                block_height, signature_index, block_id_flag, validator_address, timestamp, signature
            ) VALUES (?, ?, ?, ?, ?, ?)
        """, [
            (
                signature["height"],
                signature["index"],
                signature.get("block_id_flag"),
                signature.get("validator_address"),
                signature.get("timestamp"),
                signature.get("signature"),
            )
            for signature in signatures
        ])

    async def _save_transactions_batch(self, db, transactions: list[dict]):
        await db.executemany("""
            INSERT OR REPLACE INTO transactions (
                hash, transaction_index, height, messages_json, memo, timeout_height,
                timeout_timestamp, unordered, extension_options_json,
                non_critical_extension_options_json, fee_amount_json,
                gas_limit, payer, granter, signer_infos_json,
                signatures, msg_types, raw_data
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, [
            (
                transaction["hash"],
                transaction["index"],
                transaction["height"],
                json.dumps(transaction.get("body", {}).get("messages", [])),
                transaction["body"]["memo"],
                transaction["body"]["timeout_height"],
                json.dumps(transaction.get("body", {}).get("timeout_timestamp", "")),
                transaction["body"]["unordered"],
                json.dumps(transaction.get("body", {}).get("extension_options", [])),
                json.dumps(transaction.get("body", {}).get("non_critical_extension_options", [])),
                json.dumps(transaction.get("auth_info", {}).get("fee", {}).get("amount", [])),
                transaction["auth_info"]["fee"]["gas_limit"],
                transaction["auth_info"]["fee"]["payer"],
                transaction["auth_info"]["fee"]["granter"],
                json.dumps(transaction.get("auth_info", {}).get("signer_infos", [])),
                json.dumps(transaction.get("signatures", [])),
                json.dumps(transaction.get("msg_types", [])),
                transaction["raw_data"],
            )
            for transaction in transactions
        ])
    
    async def _save_transaction_participants_batch(self, db, transaction_participants: list[dict]):
        await db.executemany("""
            INSERT INTO transaction_participants (
                height, transaction_hash, address, role
            ) VALUES (?, ?, ?, ?)
        """, [
            (
                transaction_participant["height"],
                transaction_participant["transaction_hash"],
                transaction_participant["address"],
                transaction_participant["role"],
            )
            for transaction_participant in transaction_participants
        ])
    
    async def _save_block_results_batch(self, db, block_results: list[dict]):
        await db.executemany("""
            INSERT OR REPLACE INTO block_results (
                height, app_hash, consensus_param_updates_json, finalize_block_events_json, validator_updates_json
            ) VALUES (?, ?, ?, ?, ?)
        """, [
            (
                int(block_result["height"]),
                block_result["app_hash"],
                json.dumps(block_result.get("consensus_param_updates", {})),
                json.dumps(block_result.get("finalize_block_events", [])),
                json.dumps(block_result.get("validator_updates", None)),
            )
            for block_result in block_results
        ])
    
    async def _save_transaction_results_batch(self, db, transaction_results: list[dict]):
        await db.executemany("""
            INSERT OR REPLACE INTO transaction_results (
                transaction_hash, height, code, codespace, data, gas_wanted, gas_used, info, log
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, [
            (
                transaction_result["transaction_hash"],
                transaction_result["height"],
                transaction_result["code"],
                transaction_result["codespace"],
                transaction_result["data"],
                transaction_result["gas_wanted"],
                transaction_result["gas_used"],
                transaction_result["info"],
                transaction_result["log"],
            )
            for transaction_result in transaction_results
        ])            

    async def _save_transaction_events_batch(self, db, transaction_events: list[dict]):
            await db.executemany("""
                INSERT INTO transaction_events (
                    height, transaction_hash, type, key, value, indexed
                ) VALUES (?, ?, ?, ?, ?, ?)
            """, [
                (
                    transaction_event["height"],
                    transaction_event["transaction_hash"],
                    transaction_event["type"],
                    transaction_event["key"],
                    transaction_event["value"],
                    transaction_event["indexed"],
                )
                for transaction_event in transaction_events
            ])

    async def save_block_full_batch(
        self,
        blocks_batch: list[dict],
        commit_signatures_batch: list[dict],
        transactions_batch: list[dict],
        participants_batch: list[dict],
        block_results_batch: list[dict],
        transaction_results_batch: list[dict],
        transaction_events_batch: list[dict],
    ):
        async with aiosqlite.connect(self.db_path) as db:
            try:
                await db.execute("BEGIN")
                await self._save_blocks_batch(db, blocks_batch)
                logger.info(f"Saved blocks data for {len(blocks_batch)}")
                await self._save_block_commit_signatures_batch(db, commit_signatures_batch)
                logger.info(f"Saved block_commit_signatures data for {len(commit_signatures_batch)}")
                await self._save_transactions_batch(db, transactions_batch)
                logger.info(f"Saved transactions data for {len(transactions_batch)}")
                await self._save_transaction_participants_batch(db, participants_batch)
                logger.info(f"Saved transaction_participants data for {len(participants_batch)}")
                await self._save_block_results_batch(db, block_results_batch)
                logger.info(f"Saved transaction_results data for {len(block_results_batch)}")
                await self._save_transaction_results_batch(db, transaction_results_batch)
                logger.info(f"Saved transaction_results data for {len(transaction_results_batch)}")
                await self._save_transaction_events_batch(db, transaction_events_batch)
                logger.info(f"Saved transaction_events data for {len(transaction_events_batch)}")
                await db.commit()
                return True

            except Exception as e:
                await db.rollback()
                raise e

    async def get_latest_block_height(self) -> int:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""SELECT MAX(height) AS latest_height FROM blocks;""") as cursor:
                row = await cursor.fetchone()
                if row is None or row["latest_height"] is None:
                    return 0
                return int(row["latest_height"])

    async def get_latest_transactions(self, limit: int = 50) -> Optional[List[Dict[str, Any]]]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            
            async with db.execute("""
                SELECT height, tx_hash, messages, timestamp
                FROM transactions_old
                ORDER BY height DESC
                LIMIT ?
            """, (limit,)) as cursor:
                rows = await cursor.fetchall()
                if not rows:
                    return None
                return [dict(row) for row in rows]
    
    async def get_recent_block_stats(self, limit: int = 100) -> list[dict]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row

            async with db.execute("""
                SELECT height, COUNT(*) AS tx_count, MAX(timestamp) AS timestamp FROM transactions_old
                WHERE height IN (SELECT DISTINCT height FROM transactions_old ORDER BY height DESC LIMIT ?)
                GROUP BY height ORDER BY height DESC
            """,(limit,)) as cursor:
                rows = await cursor.fetchall()

                return [
                    {
                        "height": row["height"],
                        "tx_count": row["tx_count"],
                        "timestamp": row["timestamp"],
                    }
                    for row in rows
                ]

    async def upsert_participant_node_geo(self,
        participant_index: str,
        inference_url: str,
        ip: str,
        geo: Dict[str, Any]
    ):
        last_updated = datetime.utcnow().isoformat()
        
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row

            await db.execute("""
                INSERT INTO participant_node_geo (
                    participant_index, inference_url, ip, country_code, country, region, city,
                    latitude, longitude, last_updated
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(participant_index) DO UPDATE SET
                    inference_url = excluded.inference_url, 
                    ip = excluded.ip,
                    country_code = excluded.country_code,
                    country = excluded.country, 
                    region = excluded.region,
                    city = excluded.city,
                    latitude = excluded.latitude,
                    longitude = excluded.longitude,
                    last_updated = excluded.last_updated
            """, (
                participant_index, inference_url, ip, geo.get("country_code"), geo.get("country"), geo.get("region"), 
                geo.get("city"), geo.get("latitude"), geo.get("longitude"), last_updated
            ))
            await db.commit()

    async def get_all_participant_node_geo(self):
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("SELECT * FROM participant_node_geo") as cursor:
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]
    
    async def get_all_inference_urls(self) -> List[str]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("SELECT MAX(epoch_id) AS max_epoch FROM inference_stats") as cursor:
                row = await cursor.fetchone()
                if not row or row["max_epoch"] is None:
                    return []
                max_epoch = row["max_epoch"]
            
            async with db.execute(
                "SELECT stats_json FROM inference_stats WHERE epoch_id = ?",(max_epoch,)
            ) as cursor:
                rows = await cursor.fetchall()
            
            urls = set()
            for r in rows:
                data = json.loads(r["stats_json"])
                inference_url= data.get("inference_url")
                if inference_url:
                    urls.add(inference_url.strip())
            return list(urls)
    
    async def delete_participant_node_geo_except(self, participant_indexs: list[str]):
        if not participant_indexs:
            return
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row

            placeholders = ",".join("?" for _ in participant_indexs)
            await db.execute(f"""
                DELETE FROM participant_node_geo
                WHERE participant_index NOT IN ({placeholders})
            """, participant_indexs)
            await db.commit()

    async def get_all_models(self) -> List[dict]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT epoch_id, model_id, total_weight, participant_count, cached_at FROM models
                ORDER BY epoch_id ASC
            """) as cursor:
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]

    async def get_all_models_api_cache(self) -> List[dict]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT m1.* FROM models_api_cache m1
                JOIN (SELECT epoch_id, MAX(height) AS max_height FROM models_api_cache GROUP BY epoch_id) m2
                ON m1.epoch_id = m2.epoch_id AND m1.height = m2.max_height
                ORDER BY m1.epoch_id ASC
            """) as cursor:
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]

    async def get_model_token_usage_all_epochs(self, model: str) -> List[Dict[str, int]]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT
                    epoch_id,
                    SUM(COALESCE(CAST(prompt_token_count AS INTEGER), 0)) AS total_prompt_tokens,
                    SUM(COALESCE(CAST(completion_token_count AS INTEGER), 0)) AS total_completion_tokens,
                    COUNT(*) AS inference_count
                FROM participant_inferences
                WHERE model = ?
                AND status != '_EMPTY_MARKER_'
                AND epoch_id IN (
                    SELECT DISTINCT epoch_id
                    FROM participant_inferences
                    WHERE model = ?
                    ORDER BY epoch_id DESC
                    LIMIT 30
                )
                GROUP BY epoch_id
                ORDER BY epoch_id ASC
            """, (model, model)) as cursor:
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]

    async def get_hardware_aggregate(self, epoch_id: int) -> list[dict]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT
                    json_extract(hw.value, '$.type') AS hardware,
                    SUM(CAST(json_extract(hw.value, '$.count') AS INTEGER)) AS amount,
                    SUM(COALESCE(poc_weight, 0)) AS total_weight
                FROM participant_hardware_nodes,
                    json_each(hardware_json) AS hw
                WHERE epoch_id = ?
                GROUP BY hardware
                """, (epoch_id,)) as cursor:
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]
    
    async def get_hardware_models(self, epoch_id: int) -> list[dict]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                    SELECT DISTINCT json_extract(hw.value, '$.type') AS hardware, mj.value AS model
                    FROM participant_hardware_nodes
                    JOIN json_each(hardware_json) AS hw
                    JOIN json_each(models_json) AS mj
                    WHERE epoch_id = ?
                """, (epoch_id,)) as cursor:
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]
    
    async def get_hardware_nodes_by_epoch(self, epoch_id: int, hardware: str) -> list[dict]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT *
                FROM participant_hardware_nodes
                WHERE epoch_id = ?
                AND EXISTS (
                    SELECT 1
                    FROM json_each(hardware_json)
                    WHERE json_extract(value, '$.type') = ?
                )
                """, (epoch_id, hardware))  as cursor:
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]

    async def get_hardware_metrics(self) -> list[dict]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT
                    epoch_id,
                    json_extract(hw.value, '$.type') AS hardware,
                    SUM(CAST(json_extract(hw.value, '$.count') AS INTEGER)) AS amount,
                    SUM(COALESCE(poc_weight, 0)) AS total_weight
                FROM participant_hardware_nodes,
                    json_each(hardware_json) AS hw
                GROUP BY epoch_id, hardware
                ORDER BY epoch_id
                """)  as cursor:
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]
    
    async def save_epoch_participants_snapshot(self, epoch_id: int, epoch_data: dict, fetched_from: str | None = None):
        fetched_at = datetime.utcnow().isoformat()
        active = epoch_data.get("active_participants", {}) or {}
        effective_block_height = active.get("effective_block_height")
        poc_start_block_height = active.get("poc_start_block_height")
        created_at_block_height = active.get("created_at_block_height")
        participants = active.get("participants", []) or []
        validators = epoch_data.get("validators", []) or []
        participant_count = len(participants)
        validator_count = len(validators)
        snapshot_json = json.dumps(epoch_data)

        if effective_block_height is None:
            raise ValueError(
                f"epoch {epoch_id} snapshot missing effective_block_height"
            )

        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            await db.execute("""
                INSERT OR REPLACE INTO epoch_participants_snapshot (
                    epoch_id, effective_block_height, poc_start_block_height, created_at_block_height,
                    participant_count, validator_count, snapshot_json, fetched_from, fetched_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                epoch_id, effective_block_height, poc_start_block_height, created_at_block_height,
                participant_count, validator_count, snapshot_json, fetched_from, fetched_at
            ))

            await db.commit()

        logger.info(f"Saved epoch_participants_snapshot for epoch {epoch_id} (participants={participant_count}, validators={validator_count})")
    
    async def get_epoch_participants_snapshot(self, epoch_id: int) -> dict | None:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT snapshot_json FROM epoch_participants_snapshot WHERE epoch_id = ?
            """, (epoch_id,)) as cursor:
                row = await cursor.fetchone()
                if not row:
                    return None

                try:
                    return json.loads(row["snapshot_json"])
                except json.JSONDecodeError as e:
                    logger.error(f"Invalid snapshot_json for epoch {epoch_id}: {e}")
                    return None

    async def save_proposal(self, proposal: dict):
        tally = proposal.get("final_tally_result", {})
        tally_params = proposal.get("tally_params", {})

        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT OR REPLACE INTO gov_proposals (
                    id, status, code, metadata, title, summary, proposer, expedited, failed_reason,
                    submit_time, deposit_end_time, voting_start_time, voting_end_time,
                    yes_count, abstain_count, no_count, no_with_veto_count,
                    quorum, threshold, veto_threshold,
                    epoch_id, voting_start_height, total_weight, voted_weight, total_voters, total_participants,
                    total_vote_txs, total_submit_txs, total_deposit_txs,
                    total_deposit_json, messages_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?,
                        ?, ?, ?, ?,
                        ?, ?, ?, ?,
                        ?, ?, ?,
                        ?, ?, ?, ?, ?, ?,
                        ?, ?, ?, 
                        ?, ?)
            """,(
                int(proposal["id"]),
                proposal["status"],
                proposal["code"],
                proposal["metadata"],
                proposal["title"],
                proposal["summary"],
                proposal["proposer"],
                int(proposal.get("expedited", False)),
                proposal["failed_reason"], 
                proposal["submit_time"],
                proposal["deposit_end_time"],
                proposal["voting_start_time"],
                proposal["voting_end_time"],
                tally["yes_count"],
                tally["abstain_count"],
                tally["no_count"],
                tally["no_with_veto_count"],
                tally_params["quorum"],
                tally_params["threshold"],
                tally_params["veto_threshold"],
                proposal["epoch_id"],
                proposal["voting_start_height"],
                proposal["total_weight"],
                proposal["voted_weight"],
                proposal["total_voters"],
                proposal["total_participants"],

                proposal["total_vote_txs"],
                proposal["total_submit_txs"],
                proposal["total_deposit_txs"],

                json.dumps(proposal.get("total_deposit", [])),
                json.dumps(proposal.get("messages", [])),
            ))

            await db.commit()
        logger.info(f"Saved proposal for id {proposal['id']}")
    
    async def get_proposal(self, proposal_id: int) -> dict | None:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""SELECT * FROM gov_proposals WHERE id = ?""", (proposal_id,)) as cursor:
                row = await cursor.fetchone()
                if not row:
                    return None
                
                return {
                    "id": row["id"],
                    "status": row["status"],
                    "code": row["code"],
                    "metadata": row["metadata"],
                    "title": row["title"],
                    "summary": row["summary"],
                    "proposer": row["proposer"],
                    "expedited": bool(row["expedited"]),
                    "failed_reason": row["failed_reason"],
                    "submit_time": row["submit_time"],
                    "deposit_end_time": row["deposit_end_time"],
                    "voting_start_time": row["voting_start_time"],
                    "voting_end_time": row["voting_end_time"],
                    "final_tally_result": {
                        "yes_count": row["yes_count"],
                        "abstain_count": row["abstain_count"],
                        "no_count": row["no_count"],
                        "no_with_veto_count": row["no_with_veto_count"],
                    },
                    "tally_params": {
                        "quorum": row["quorum"],
                        "threshold": row["threshold"],
                        "veto_threshold": row["veto_threshold"],
                    },
                    "epoch_id": row["epoch_id"],
                    "voting_start_height": row["voting_start_height"],
                    "total_weight": row["total_weight"],
                    "voted_weight": row["voted_weight"],
                    "total_voters": row["total_voters"],
                    "total_participants": row["total_participants"],
                    "total_vote_txs": row["total_vote_txs"],
                    "total_submit_txs": row["total_submit_txs"],
                    "total_deposit_txs": row["total_deposit_txs"],
                    "messages": json.loads(row["messages_json"]),
                    "total_deposit": json.loads(row["total_deposit_json"]),
                }
    

    async def get_proposals_by_code(self, code: int) -> list:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM gov_proposals WHERE code = ? ORDER BY id DESC
            """, (code,)) as cursor:
                rows = await cursor.fetchall()
                proposals = []
                for row in rows:
                    proposals.append({
                        "id": row["id"],
                        "status": row["status"],
                        "code": row["code"],
                        "metadata": row["metadata"],
                        "title": row["title"],
                        "summary": row["summary"],
                        "proposer": row["proposer"],
                        "expedited": bool(row["expedited"]),
                        "failed_reason": row["failed_reason"],
                        "submit_time": row["submit_time"],
                        "deposit_end_time": row["deposit_end_time"],
                        "voting_start_time": row["voting_start_time"],
                        "voting_end_time": row["voting_end_time"],
                        "final_tally_result": {
                            "yes_count": row["yes_count"],
                            "abstain_count": row["abstain_count"],
                            "no_count": row["no_count"],
                            "no_with_veto_count": row["no_with_veto_count"],
                        },
                        "tally_params": {
                            "quorum": row["quorum"],
                            "threshold": row["threshold"],
                            "veto_threshold": row["veto_threshold"],
                        },
                        "epoch_id": row["epoch_id"],
                        "voting_start_height": row["voting_start_height"],
                        "total_weight": row["total_weight"],
                        "voted_weight": row["voted_weight"],
                        "total_voters": row["total_voters"],
                        "total_participants": row["total_participants"],
                        "total_vote_txs": row["total_vote_txs"],
                        "total_submit_txs": row["total_submit_txs"],
                        "total_deposit_txs": row["total_deposit_txs"],
                        "messages": json.loads(row["messages_json"]),
                        "total_deposit": json.loads(row["total_deposit_json"]),
                    })

                return proposals

    async def save_params_snapshot(self, height: int, module: str, params: dict, proposal_id: int | None):
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT OR REPLACE INTO params_snapshot
                (height, proposal_id, module, params_json)
                VALUES (?, ?, ?, ?)
            """, (height, proposal_id, module, json.dumps(params)))

            await db.commit()

        logger.info(f"Saved params_snapshot for module={module} at height={height}")

    async def get_latest_params_snapshot(self, module: str, height: int) -> dict | None:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT params_json FROM params_snapshot WHERE module = ? AND height < ?
                ORDER BY height DESC LIMIT 1
            """,(module, height)) as cursor:
                row = await cursor.fetchone()
                return json.loads(row["params_json"]) if row else None


