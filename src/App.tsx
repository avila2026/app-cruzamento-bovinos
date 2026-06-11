import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import MainLayout from './components/layout/MainLayout';
import AnimalList from './features/animals/AnimalList';
import AnimalForm from './features/animals/AnimalForm';
import AnimalDetails from './features/animals/AnimalDetails';
import EvaluationForm from './features/evaluations/EvaluationForm';
import Assistant from './features/assistant/Assistant';
import ImportCatalog from './features/animals/ImportCatalog';
import ObservationList from './features/animals/ObservationList';
import Simulator from './features/simulator/Simulator';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';
import Config from './pages/Config';


function App() {
  return (
    <>
      <Toaster theme="dark" position="top-right" richColors />
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
            <Route path="observacao" element={<ObservationList />} />
            <Route path="importar-catalogo" element={<ImportCatalog />} />
            <Route path="assistente" element={<Assistant />} />
            <Route path="simulador" element={<Simulator />} />
            <Route path="relatorios" element={<Reports />} />
            <Route path="config" element={<Config />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
