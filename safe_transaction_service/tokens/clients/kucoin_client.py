import logging

import requests

from .exceptions import CannotGetPrice

logger = logging.getLogger(__name__)


class KucoinClient:
    EWT_PRICE_URL = 'https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=EWT-USDT'
    XDC_PRICE_URL = 'https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=XDC-USDT'

    def __init__(self):
        self.http_session = requests.Session()

    def get_price(self, url) -> float:
        try:
            response = self.http_session.get(url, timeout=10)
            result = response.json()
            return float(result['data']['price'])
        except (ValueError, IOError) as e:
            raise CannotGetPrice from e

    def get_ewt_usd_price(self) -> float:
        return self.get_price(self.EWT_PRICE_URL)

    def get_xdc_usd_price(self) -> float:
        return self.get_price(self.XDC_PRICE_URL)
