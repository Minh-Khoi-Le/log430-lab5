import React, { useState } from 'react';

const SaleForm = () => {
  const [saleData, setSaleData] = useState({
    total: '',
    userId: '',
    storeId: '',
    lines: [],
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSaleData({ ...saleData, [name]: value });
  };

  const handleLineChange = (index, e) => {
    const { name, value } = e.target;
    const newLines = [...saleData.lines];
    newLines[index] = { ...newLines[index], [name]: value };
    setSaleData({ ...saleData, lines: newLines });
  };

  const addLine = () => {
    setSaleData({ ...saleData, lines: [...saleData.lines, { productId: '', quantity: '', unitPrice: '' }] });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Submit saleData to the API
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Create Sale</h2>
      <div>
        <label>Total:</label>
        <input type="number" name="total" value={saleData.total} onChange={handleChange} required />
      </div>
      <div>
        <label>User ID:</label>
        <input type="text" name="userId" value={saleData.userId} onChange={handleChange} required />
      </div>
      <div>
        <label>Store ID:</label>
        <input type="text" name="storeId" value={saleData.storeId} onChange={handleChange} required />
      </div>
      <h3>Sale Lines</h3>
      {saleData.lines.map((line, index) => (
        <div key={index}>
          <label>Product ID:</label>
          <input type="text" name="productId" value={line.productId} onChange={(e) => handleLineChange(index, e)} required />
          <label>Quantity:</label>
          <input type="number" name="quantity" value={line.quantity} onChange={(e) => handleLineChange(index, e)} required />
          <label>Unit Price:</label>
          <input type="number" name="unitPrice" value={line.unitPrice} onChange={(e) => handleLineChange(index, e)} required />
        </div>
      ))}
      <button type="button" onClick={addLine}>Add Line</button>
      <button type="submit">Submit Sale</button>
    </form>
  );
};

export default SaleForm;