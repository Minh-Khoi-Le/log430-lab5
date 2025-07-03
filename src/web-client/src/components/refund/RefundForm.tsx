import React, { useState } from 'react';

const RefundForm = () => {
  const [refundData, setRefundData] = useState({
    saleId: '',
    total: '',
    reason: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setRefundData({
      ...refundData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Call the API to create a refund
    try {
      const response = await fetch('/api/refunds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(refundData),
      });
      if (response.ok) {
        // Handle successful refund creation
        alert('Refund created successfully!');
      } else {
        // Handle error response
        alert('Failed to create refund.');
      }
    } catch (error) {
      console.error('Error creating refund:', error);
      alert('An error occurred while creating the refund.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="saleId">Sale ID:</label>
        <input
          type="text"
          id="saleId"
          name="saleId"
          value={refundData.saleId}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label htmlFor="total">Total:</label>
        <input
          type="number"
          id="total"
          name="total"
          value={refundData.total}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label htmlFor="reason">Reason:</label>
        <textarea
          id="reason"
          name="reason"
          value={refundData.reason}
          onChange={handleChange}
          required
        />
      </div>
      <button type="submit">Submit Refund</button>
    </form>
  );
};

export default RefundForm;