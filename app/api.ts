import axios from 'axios';

const API_BASE_URL = 'https://your-api-base-url.com';

export interface Ticket {
  nomor: string;
  status: string;
  layanan: string;
  regId: string;
  witel: string;
  headline: string;
  cidSid: string;
  lamaGangguan: number;
  dispatchOwner: string;
  lamaUpdate: number;
}

export const fetchTickets = async (): Promise<Ticket[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/tickets`);
    return response.data;
  } catch (error) {
    console.error('Error fetching tickets:', error);
    throw error;
  }
};

export const searchTickets = async (searchTerm: string): Promise<Ticket[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/tickets/search`, {
      params: { q: searchTerm }
    });
    return response.data;
  } catch (error) {
    console.error('Error searching tickets:', error);
    throw error;
  }
};