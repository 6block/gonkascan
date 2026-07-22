import asyncio
import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.router import router, set_inference_service
from backend.client import GonkaClient
from backend.gonka_gg_client import GonkaGGClient
from backend.database import CacheDB
from backend.service import InferenceService

logging.basicConfig(
    level=logging.INFO,
    format='%(levelname)s:     %(message)s'
)
logger = logging.getLogger(__name__)

POLL_CURRENT_EPOCH_INTERVAL = int(os.getenv("POLL_CURRENT_EPOCH_INTERVAL", "30"))
POLL_JAIL_STATUS_INTERVAL = int(os.getenv("POLL_JAIL_STATUS_INTERVAL", "120"))
POLL_NODE_HEALTH_INTERVAL = int(os.getenv("POLL_NODE_HEALTH_INTERVAL", "60"))
POLL_REWARDS_INTERVAL = int(os.getenv("POLL_REWARDS_INTERVAL", "60"))
POLL_WARM_KEYS_INTERVAL = int(os.getenv("POLL_WARM_KEYS_INTERVAL", "300"))
POLL_WARM_KEYS_BATCH_SIZE = int(os.getenv("POLL_WARM_KEYS_BATCH_SIZE", "10"))
POLL_HARDWARE_NODES_INTERVAL = int(os.getenv("POLL_HARDWARE_NODES_INTERVAL", "600"))
POLL_HARDWARE_NODES_BATCH_SIZE = int(os.getenv("POLL_HARDWARE_NODES_BATCH_SIZE", "10"))
POLL_EPOCH_TOTAL_REWARDS_INTERVAL = int(os.getenv("POLL_EPOCH_TOTAL_REWARDS_INTERVAL", "600"))
POLL_PARTICIPANT_INFERENCES_INTERVAL = int(os.getenv("POLL_PARTICIPANT_INFERENCES_INTERVAL", "1200"))
POLL_MODELS_API_INTERVAL = int(os.getenv("POLL_MODELS_API_INTERVAL", "300"))
POLL_TIMELINE_INTERVAL = int(os.getenv("POLL_TIMELINE_INTERVAL", "30"))
POLL_CONFIRMATION_DATA_INTERVAL = int(os.getenv("POLL_CONFIRMATION_DATA_INTERVAL", "120"))
POLL_BLOCKS_INTERVAL = int(os.getenv("POLL_BLOCKS_INTERVAL", "10"))
POLL_PROPOSALS_INTERVAL = int(os.getenv("POLL_PROPOSALS_INTERVAL", "60"))
POLL_MARKET_STATS_INTERVAL = int(os.getenv("POLL_MARKET_STATS_INTERVAL", "60"))

# gonka.gg public inference-stats API. Their soft cap is ~10 req/min; these
# intervals add up to roughly 1.4 req/min.
GONKA_GG_API_BASE = os.getenv("GONKA_GG_API_BASE", "https://gonka-backend-production.up.railway.app/api/public")
GONKA_GG_API_KEY = os.getenv("GONKA_GG_API_KEY", "")
POLL_INF_RECENT_INTERVAL = int(os.getenv("POLL_INF_RECENT_INTERVAL", "60"))
POLL_INF_GATEWAYS_INTERVAL = int(os.getenv("POLL_INF_GATEWAYS_INTERVAL", "60"))
POLL_INF_TOP_MODELS_INTERVAL = int(os.getenv("POLL_INF_TOP_MODELS_INTERVAL", "120"))
POLL_INF_TIMESERIES_INTERVAL = int(os.getenv("POLL_INF_TIMESERIES_INTERVAL", "300"))
POLL_INF_EPOCH_HISTORY_INTERVAL = int(os.getenv("POLL_INF_EPOCH_HISTORY_INTERVAL", "300"))

background_task = None
inference_stats_polling_tasks = []
jail_polling_task = None
health_polling_task = None
rewards_polling_task = None
warm_keys_polling_task = None
hardware_nodes_polling_task = None
epoch_total_rewards_polling_task = None
participant_inferences_polling_task = None
models_api_polling_task = None
timeline_polling_task = None
confirmation_polling_task = None
inference_service_instance = None
transactions_polling_task = None
blocks_polling_task = None
proposals_polling_task = None

async def poll_current_epoch():
    while True:
        try:
            if inference_service_instance:
                await inference_service_instance.get_current_epoch_stats(reload=True)
                logger.info("Background polling: fetched current epoch stats")
        except Exception as e:
            logger.error(f"Background polling error: {e}")
        
        await asyncio.sleep(POLL_CURRENT_EPOCH_INTERVAL)


async def poll_jail_status():
    await asyncio.sleep(10)
    
    while True:
        try:
            if inference_service_instance:
                epoch_data = await inference_service_instance.client.get_current_epoch_participants()
                epoch_id = epoch_data["active_participants"]["epoch_group_id"]
                height = await inference_service_instance.client.get_latest_height()
                active_participants = epoch_data["active_participants"]["participants"]
                
                await inference_service_instance.fetch_and_cache_jail_statuses(
                    epoch_id, height, active_participants
                )
                logger.info("Background polling: fetched jail statuses")
        except Exception as e:
            logger.error(f"Jail polling error: {e}")
        
        await asyncio.sleep(POLL_JAIL_STATUS_INTERVAL)


async def poll_node_health():
    await asyncio.sleep(5)
    
    while True:
        try:
            if inference_service_instance:
                epoch_data = await inference_service_instance.client.get_current_epoch_participants()
                active_participants = epoch_data["active_participants"]["participants"]

                await inference_service_instance.sync_participant_geo_cache(active_participants)
                await inference_service_instance.fetch_and_cache_node_health(active_participants)
                logger.info("Background polling: fetched node health")
        except Exception as e:
            logger.error(f"Node health polling error: {e}")
        
        await asyncio.sleep(POLL_NODE_HEALTH_INTERVAL)


async def poll_rewards():
    await asyncio.sleep(15)
    
    while True:
        try:
            if inference_service_instance:
                await inference_service_instance.poll_participant_rewards()
        except Exception as e:
            logger.error(f"Rewards polling error: {e}")
        
        await asyncio.sleep(POLL_REWARDS_INTERVAL)


async def poll_warm_keys():
    await asyncio.sleep(20)
    
    while True:
        try:
            if inference_service_instance:
                await inference_service_instance.poll_warm_keys(batch_size=POLL_WARM_KEYS_BATCH_SIZE)
        except Exception as e:
            logger.error(f"Warm keys polling error: {e}")
        
        await asyncio.sleep(POLL_WARM_KEYS_INTERVAL)


async def poll_hardware_nodes():
    await asyncio.sleep(25)
    
    while True:
        try:
            if inference_service_instance:
                await inference_service_instance.poll_hardware_nodes(batch_size=POLL_HARDWARE_NODES_BATCH_SIZE)
        except Exception as e:
            logger.error(f"Hardware nodes polling error: {e}")
        
        await asyncio.sleep(POLL_HARDWARE_NODES_INTERVAL)


async def poll_epoch_total_rewards():
    await asyncio.sleep(30)
    
    while True:
        try:
            if inference_service_instance:
                await inference_service_instance.poll_epoch_total_rewards()
        except Exception as e:
            logger.error(f"Epoch total rewards polling error: {e}")
        
        await asyncio.sleep(POLL_EPOCH_TOTAL_REWARDS_INTERVAL)


async def poll_participant_inferences():
    while True:
        try:
            if inference_service_instance:
                await inference_service_instance.poll_participant_inferences()
        except Exception as e:
            logger.error(f"Participant inferences polling error: {e}")
        
        await asyncio.sleep(POLL_PARTICIPANT_INFERENCES_INTERVAL)


async def poll_models_api():
    await asyncio.sleep(35)
    
    while True:
        try:
            if inference_service_instance:
                await inference_service_instance.poll_models_api_cache()
        except Exception as e:
            logger.error(f"Models API polling error: {e}")
        
        await asyncio.sleep(POLL_MODELS_API_INTERVAL)


async def poll_timeline():
    await asyncio.sleep(40)
    
    while True:
        try:
            if inference_service_instance:
                await inference_service_instance.get_timeline()
                logger.info("Background polling: fetched timeline data")
        except Exception as e:
            logger.error(f"Timeline polling error: {e}")
        
        await asyncio.sleep(POLL_TIMELINE_INTERVAL)


async def poll_confirmation_data():
    await asyncio.sleep(5)
    
    while True:
        try:
            if inference_service_instance:
                epoch_data = await inference_service_instance.client.get_current_epoch_participants()
                epoch_id = epoch_data["active_participants"]["epoch_group_id"]
                height = await inference_service_instance.client.get_latest_height()
                active_participants = epoch_data["active_participants"]["participants"]
                
                await inference_service_instance.fetch_and_cache_confirmation_data(
                    epoch_id, height, active_participants
                )
                logger.info("Background polling: fetched confirmation data")
        except Exception as e:
            logger.error(f"Confirmation data polling error: {e}")
        
        await asyncio.sleep(POLL_CONFIRMATION_DATA_INTERVAL)

async def poll_blocks():
    await asyncio.sleep(60)

    while True:
        try:
            if inference_service_instance:
                await inference_service_instance.fetch_and_cache_blocks()
                logger.info("Background polling: fetched and saved blocks")
        except Exception as e:
            logger.error(f"Block polling error: {e}")

        await asyncio.sleep(POLL_BLOCKS_INTERVAL)

async def poll_proposals():
    await asyncio.sleep(55)

    while True:
        try:
            if inference_service_instance:
                await inference_service_instance.fetch_and_cache_proposal()
                logger.info("Background polling: fetched and saved proposals")
        except Exception as e:
            logger.error(f"Proposal polling error: {e}")

        await asyncio.sleep(POLL_PROPOSALS_INTERVAL)


async def poll_market_stats():
    await asyncio.sleep(10)

    while True:
        try:
            if inference_service_instance:
                await inference_service_instance.poll_market_stats()
                logger.info("Background polling: fetched and saved market stats")
        except Exception as e:
            logger.error(f"Market stats polling error: {e}")

        await asyncio.sleep(POLL_MARKET_STATS_INTERVAL)


async def _poll_inference_stats_loop(name: str, method_name: str, interval: int, start_delay: int):
    """Drive one gonka.gg dataset poll on its own cadence.

    Start delays are staggered so we never fire all five requests in the same
    second, which keeps us comfortably inside their ~10 req/min soft limit.
    """
    await asyncio.sleep(start_delay)

    while True:
        try:
            if inference_service_instance:
                await getattr(inference_service_instance, method_name)()
        except Exception as e:
            logger.error(f"Inference stats polling error ({name}): {e}")

        await asyncio.sleep(interval)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global background_task, jail_polling_task, health_polling_task, rewards_polling_task, warm_keys_polling_task, hardware_nodes_polling_task, epoch_total_rewards_polling_task, participant_inferences_polling_task, models_api_polling_task, timeline_polling_task, confirmation_polling_task, inference_service_instance
    
    db_path = os.getenv("CACHE_DB_PATH", "cache.db")
    
    logger.info(f"Database path: {db_path}")
    logger.info(f"Polling intervals (s): epoch={POLL_CURRENT_EPOCH_INTERVAL}, jail={POLL_JAIL_STATUS_INTERVAL}, health={POLL_NODE_HEALTH_INTERVAL}, rewards={POLL_REWARDS_INTERVAL}")
    logger.info(f"Polling intervals (s): warm_keys={POLL_WARM_KEYS_INTERVAL}, hardware_nodes={POLL_HARDWARE_NODES_INTERVAL}, total_rewards={POLL_EPOCH_TOTAL_REWARDS_INTERVAL}, inferences={POLL_PARTICIPANT_INFERENCES_INTERVAL}, models_api={POLL_MODELS_API_INTERVAL}, timeline={POLL_TIMELINE_INTERVAL}, confirmation_data={POLL_CONFIRMATION_DATA_INTERVAL}")
    logger.info(f"Polling batch sizes: warm_keys={POLL_WARM_KEYS_BATCH_SIZE}, hardware_nodes={POLL_HARDWARE_NODES_BATCH_SIZE}")
    
    cache_db = CacheDB(db_path)
    await cache_db.initialize()

    inference_urls = os.getenv("INFERENCE_URLS", "http://node2.gonka.ai:8000").split(",")
    inference_urls = [url.strip() for url in inference_urls]
    # database_inference_urls = await cache_db.get_all_inference_urls()
    # inference_urls.extend(database_inference_urls)
    logger.info(f"Initializing with all Participant inference_urls, total: {len(inference_urls)}")
    
    client = GonkaClient(base_urls=inference_urls)
    gonka_gg_client = GonkaGGClient(base_url=GONKA_GG_API_BASE, api_key=GONKA_GG_API_KEY)
    if gonka_gg_client.is_configured:
        logger.info(f"gonka.gg inference stats enabled (base: {GONKA_GG_API_BASE})")
    else:
        logger.warning("GONKA_GG_API_KEY not set; inference stats polling disabled")
    inference_service_instance = InferenceService(
        client=client, cache_db=cache_db, gonka_gg_client=gonka_gg_client
    )
    
    set_inference_service(inference_service_instance)
    
    background_task = asyncio.create_task(poll_current_epoch())
    jail_polling_task = asyncio.create_task(poll_jail_status())
    health_polling_task = asyncio.create_task(poll_node_health())
    rewards_polling_task = asyncio.create_task(poll_rewards())
    warm_keys_polling_task = asyncio.create_task(poll_warm_keys())
    hardware_nodes_polling_task = asyncio.create_task(poll_hardware_nodes())
    epoch_total_rewards_polling_task = asyncio.create_task(poll_epoch_total_rewards())
    participant_inferences_polling_task = asyncio.create_task(poll_participant_inferences())
    models_api_polling_task = asyncio.create_task(poll_models_api())
    timeline_polling_task = asyncio.create_task(poll_timeline())
    confirmation_polling_task = asyncio.create_task(poll_confirmation_data())
    blocks_polling_task = asyncio.create_task(poll_blocks())
    proposals_polling_task = asyncio.create_task(poll_proposals())
    market_stats_polling_task = asyncio.create_task(poll_market_stats())
    inference_stats_polling_tasks = [
        asyncio.create_task(_poll_inference_stats_loop(
            "recent", "poll_inference_recent", POLL_INF_RECENT_INTERVAL, 12)),
        asyncio.create_task(_poll_inference_stats_loop(
            "gateways", "poll_inference_gateways", POLL_INF_GATEWAYS_INTERVAL, 18)),
        asyncio.create_task(_poll_inference_stats_loop(
            "top_models", "poll_inference_top_models", POLL_INF_TOP_MODELS_INTERVAL, 24)),
        asyncio.create_task(_poll_inference_stats_loop(
            "timeseries", "poll_inference_timeseries", POLL_INF_TIMESERIES_INTERVAL, 30)),
        asyncio.create_task(_poll_inference_stats_loop(
            "epoch_history", "poll_inference_epoch_history", POLL_INF_EPOCH_HISTORY_INTERVAL, 36)),
    ]
    logger.info("Background polling tasks started")
    
    yield
    
    if background_task:
        background_task.cancel()
        try:
            await background_task
        except asyncio.CancelledError:
            logger.info("Background polling task cancelled")
    
    if jail_polling_task:
        jail_polling_task.cancel()
        try:
            await jail_polling_task
        except asyncio.CancelledError:
            logger.info("Jail polling task cancelled")
    
    if health_polling_task:
        health_polling_task.cancel()
        try:
            await health_polling_task
        except asyncio.CancelledError:
            logger.info("Health polling task cancelled")
    
    if rewards_polling_task:
        rewards_polling_task.cancel()
        try:
            await rewards_polling_task
        except asyncio.CancelledError:
            logger.info("Rewards polling task cancelled")
    
    if warm_keys_polling_task:
        warm_keys_polling_task.cancel()
        try:
            await warm_keys_polling_task
        except asyncio.CancelledError:
            logger.info("Warm keys polling task cancelled")
    
    if hardware_nodes_polling_task:
        hardware_nodes_polling_task.cancel()
        try:
            await hardware_nodes_polling_task
        except asyncio.CancelledError:
            logger.info("Hardware nodes polling task cancelled")
    
    if epoch_total_rewards_polling_task:
        epoch_total_rewards_polling_task.cancel()
        try:
            await epoch_total_rewards_polling_task
        except asyncio.CancelledError:
            logger.info("Epoch total rewards polling task cancelled")
    
    if participant_inferences_polling_task:
        participant_inferences_polling_task.cancel()
        try:
            await participant_inferences_polling_task
        except asyncio.CancelledError:
            logger.info("Participant inferences polling task cancelled")
    
    if models_api_polling_task:
        models_api_polling_task.cancel()
        try:
            await models_api_polling_task
        except asyncio.CancelledError:
            logger.info("Models API polling task cancelled")
    
    if timeline_polling_task:
        timeline_polling_task.cancel()
        try:
            await timeline_polling_task
        except asyncio.CancelledError:
            logger.info("Timeline polling task cancelled")
    
    if confirmation_polling_task:
        confirmation_polling_task.cancel()
        try:
            await confirmation_polling_task
        except asyncio.CancelledError:
            logger.info("Confirmation polling task cancelled")
    
    if transactions_polling_task:
        transactions_polling_task.cancel()
        try:
            await transactions_polling_task
        except asyncio.CancelledError:
            logger.info("Transactions polling task cancelled")

    if blocks_polling_task:
        blocks_polling_task.cancel()
        try:
            await blocks_polling_task
        except asyncio.CancelledError:
            logger.info("Blocks polling task cancelled")

    for task in inference_stats_polling_tasks:
        task.cancel()
    if inference_stats_polling_tasks:
        await asyncio.gather(*inference_stats_polling_tasks, return_exceptions=True)
        logger.info("Inference stats polling tasks cancelled")
    
    if proposals_polling_task:
        proposals_polling_task.cancel()
        try:
            await proposals_polling_task
        except asyncio.CancelledError:
            logger.info("Proposals polling task cancelled")
    
    if market_stats_polling_task:
        market_stats_polling_task.cancel()
        try:
            await market_stats_polling_task
        except asyncio.CancelledError:
            logger.info("Market stats polling task cancelled")


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

