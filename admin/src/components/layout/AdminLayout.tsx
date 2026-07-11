import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { TitleBar } from './TitleBar';
import { ToastContainer } from '../ui/Toast';

export function AdminLayout() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface-0">
      <TitleBar />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}
