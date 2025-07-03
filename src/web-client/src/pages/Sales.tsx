import React, { useEffect, useState } from 'react';
import { Sale } from '../types';
import apiService from '../services/api.service';

const Sales: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchSales = async () => {
      try {
        const response = await apiService.getSales();
        setSales(response.data);
      } catch (error) {
        console.error('Error fetching sales:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSales();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Sales List</h1>
      <ul>
        {sales.map((sale) => (
          <li key={sale.id}>
            Sale ID: {sale.id}, Total: ${sale.total}, Date: {new Date(sale.date).toLocaleDateString()}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sales;