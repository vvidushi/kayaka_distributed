import FlightsPage from './FlightsPage';

// Dedicated route to open flights with the agent split-view enabled by default
const AgentFlightsPage = () => {
  return <FlightsPage forceAgentMode />;
};

export default AgentFlightsPage;
