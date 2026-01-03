import AIChatWidget from './AIChatWidget';
import { useAuth } from '../../hooks/useAuth';

const bookingPrompt = `
You are a lightweight bookings chat assistant.
- Answer only travel/bookings questions.
- You can reference flights, stays, weather, and bookings, but NEVER initiate or complete a booking.
- Respond in concise natural language, no JSON or code blocks.
- Offer helpful links (e.g., "/flights", "/hotels", "/bookings", or web links you know) when relevant.
- If asked for data you don't have, suggest where to look and provide a link instead of raw data dumps.
`;

const BookingChatWidget = () => {
  const { isAuthenticated, user } = useAuth();
  const name = (user?.firstName || user?.email || 'there').toString().trim();
  const welcomeMessage = `Hi ${name}! I can answer booking questions and point you to flights or stays.`;

  return (
    <AIChatWidget
      title="Bookings Chat"
      initialMessageOverride={null}
      welcomeMessageOverride={isAuthenticated ? welcomeMessage : 'Hi there! I can answer booking questions and point you to flights or stays.'}
      showDeals={false}
      showBundles={false}
      chatMode="booking_chat"
    />
  );
};

export default BookingChatWidget;
