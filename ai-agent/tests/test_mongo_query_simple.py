"""Simple tests for MongoQueryGenerator class."""
import pytest
from unittest.mock import Mock, AsyncMock, patch
from mongo_query_generator import MongoQueryGenerator


class TestMongoQueryGenerator:
    """Test MongoQueryGenerator functionality."""

    @pytest.fixture
    def generator(self):
        """Create MongoQueryGenerator instance with mocked LLM."""
        mock_llm = AsyncMock()
        return MongoQueryGenerator(llm=mock_llm)

    def test_generator_initialization(self, generator):
        """Test that generator initializes correctly."""
        assert generator is not None
        assert isinstance(generator, MongoQueryGenerator)
        assert hasattr(generator, 'generate')

    @pytest.mark.asyncio
    async def test_generate_flight_query(self, generator):
        """Test generating a basic flight query."""
        # Mock the LLM response
        mock_response = Mock()
        mock_response.content = '{"collection": "flights", "filters": {"from": "SFO", "to": "LAX"}, "projection": null, "sort": [], "limit": 20}'
        generator.llm.ainvoke = AsyncMock(return_value=mock_response)
        
        question = "Find flights from SFO to LAX"
        context = {"origin": "SFO", "destination": "LAX"}
        
        result = await generator.generate(question, context)
        assert isinstance(result, dict)
        assert "collection" in result or "filters" in result

    @pytest.mark.asyncio
    async def test_generate_hotel_query(self, generator):
        """Test generating a basic hotel query."""
        # Mock the LLM response
        mock_response = Mock()
        mock_response.content = '{"collection": "hotels", "filters": {"city": "San Francisco"}, "projection": null, "sort": [], "limit": 20}'
        generator.llm.ainvoke = AsyncMock(return_value=mock_response)
        
        question = "Find hotels in San Francisco"
        context = {"city": "San Francisco"}
        
        result = await generator.generate(question, context)
        assert isinstance(result, dict)
        assert "collection" in result or "filters" in result

    @pytest.mark.asyncio
    async def test_generate_car_query(self, generator):
        """Test generating a basic car rental query."""
        # Mock the LLM response
        mock_response = Mock()
        mock_response.content = '{"collection": "cars", "filters": {"city": "Los Angeles"}, "projection": null, "sort": [], "limit": 20}'
        generator.llm.ainvoke = AsyncMock(return_value=mock_response)
        
        question = "Find car rentals in Los Angeles"
        context = {"city": "Los Angeles"}
        
        result = await generator.generate(question, context)
        assert isinstance(result, dict)
        assert "collection" in result or "filters" in result
