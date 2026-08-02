import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ImportPage from './pages/ImportPage';
import TransactionsPage from './pages/TransactionsPage';
import ForecastPage from './pages/ForecastPage';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/import" element={<ImportPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/forecast" element={<ForecastPage />} />
      </Route>
    </Routes>
  );
}

export default App;
