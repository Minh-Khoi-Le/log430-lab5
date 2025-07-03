import React, { useEffect, useState } from 'react';
import { Refund } from '../types';
import apiService from '../services/api.service';

const Refunds: React.FC = () => {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchRefunds = async () => {
      try {
        const response = await apiService.getRefunds();
        setRefunds(response.data);
      } catch (error) {
        console.error('Error fetching refunds:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRefunds();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Refunds</h1>
      <ul>
        {refunds.map(refund => (
          <li key={refund.id}>
            <p>Date: {new Date(refund.date).toLocaleDateString()}</p>
            <p>Total: ${refund.total.toFixed(2)}</p>
            <p>Reason: {refund.reason}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Refunds;