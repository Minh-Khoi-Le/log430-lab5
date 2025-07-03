import React from 'react';

const Header: React.FC = () => {
  return (
    <header>
      <h1>Retail System</h1>
      <nav>
        <ul>
          <li><a href="/">Home</a></li>
          <li><a href="/sales">Sales</a></li>
          <li><a href="/refunds">Refunds</a></li>
          <li><a href="/stores">Stores</a></li>
          <li><a href="/products">Products</a></li>
        </ul>
      </nav>
    </header>
  );
};

export default Header;