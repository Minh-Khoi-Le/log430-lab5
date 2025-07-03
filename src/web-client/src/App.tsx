import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Header from './components/common/Header';
import Home from './pages/Home';
import Sales from './pages/Sales';
import Refunds from './pages/Refunds';

const App: React.FC = () => {
  return (
    <Router>
      <Header />
      <Switch>
        <Route path="/" exact component={Home} />
        <Route path="/sales" component={Sales} />
        <Route path="/refunds" component={Refunds} />
      </Switch>
    </Router>
  );
};

export default App;