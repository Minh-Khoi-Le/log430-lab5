import React, { useEffect, useState } from 'react';
import axios from 'axios';

const StoreList: React.FC = () => {
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const response = await axios.get('/api/stores'); // Adjust the API endpoint as needed
        setStores(response.data);
      } catch (err) {
        setError('Failed to fetch stores');
      } finally {
        setLoading(false);
      }
    };

    fetchStores();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div>
      <h1>Store List</h1>
      <ul>
        {stores.map(store => (
          <li key={store.id}>
            {store.name} - {store.address}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default StoreList;