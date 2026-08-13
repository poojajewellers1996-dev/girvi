import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNav from './TopNav';

export default function Layout() {
  return (
    <div className="layout-wrapper">
      <Sidebar />
      <div className="main-content">
        <TopNav />
        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
