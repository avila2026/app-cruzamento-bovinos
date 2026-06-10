import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import AnimalList from './features/animals/AnimalList';
import AnimalForm from './features/animals/AnimalForm';
import AnimalDetails from './features/animals/AnimalDetails';
import EvaluationForm from './features/evaluations/EvaluationForm';

// Placeholder components
const Dashboard = () => <div className="p-4"><h1 className="text-3xl font-bold mb-4">Dashboard</h1><p className="text-neutral-400">Bem-vindo ao sistema de cruzamentos CattleGen.</p></div>;
const Simulador = () => <div className="p-4"><h1 className="text-3xl font-bold mb-4">Simulador</h1><p className="text-neutral-400">Simulação de cruzamentos e acasalamento dirigido.</p></div>;
const Relatorios = () => <div className="p-4"><h1 className="text-3xl font-bold mb-4">Relatórios</h1><p className="text-neutral-400">Histórico e emissão de PDFs.</p></div>;
const Config = () => <div className="p-4"><h1 className="text-3xl font-bold mb-4">Configurações</h1><p className="text-neutral-400">Ajustes da fazenda e perfil.</p></div>;

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="animais" element={<AnimalList />} />
          <Route path="animais/novo" element={<AnimalForm />} />
          <Route path="animais/:id/editar" element={<AnimalForm />} />
          <Route path="animais/:id" element={<AnimalDetails />} />
          <Route path="animais/:id/avaliacao/nova" element={<EvaluationForm />} />
          <Route path="animais/:id/avaliacao/:evalId/editar" element={<EvaluationForm />} />
          <Route path="simulador" element={<Simulador />} />
          <Route path="relatorios" element={<Relatorios />} />
          <Route path="config" element={<Config />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
