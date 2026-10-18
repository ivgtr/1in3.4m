import './global.css';
import { Guidance } from './components/Guidance.jsx';
import { Button } from './components/Button.jsx';
import shared from './components/shared.module.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { lazyRouteComponent, createHashHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import { AppLayout } from './App.jsx';

const rootRoute = createRootRoute({
  component: AppLayout,
  errorComponent: ({ error }) => <main className={shared['page']}><h1>画面を開けませんでした。</h1><Guidance tone="error" actions={<Button onClick={() => location.reload()}>再読み込み</Button>}><p role="alert">{error.message}</p><p>通信状態を確認してから再読み込みしてください。</p></Guidance></main>,
  notFoundComponent: () => <main className={shared['page']}><h1>このページはありません。</h1><a href="#/">会社へ戻る</a></main>,
});
const routes = [
  createRoute({ getParentRoute: () => rootRoute, path: '/', component: lazyRouteComponent(() => import('./pages/GamePage.jsx'), 'GamePage') }),
  createRoute({ getParentRoute: () => rootRoute, path: '/history', component: lazyRouteComponent(() => import('./pages/HistoryPage.jsx'), 'HistoryPage') }),
  createRoute({ getParentRoute: () => rootRoute, path: '/about', component: lazyRouteComponent(() => import('./pages/AboutPage.jsx'), 'AboutPage') }),
];
const router = createRouter({ routeTree: rootRoute.addChildren(routes), history: createHashHistory(), defaultPendingComponent: () => <div className={shared.page}><Guidance><p role="status">画面を読み込み中…</p></Guidance></div> });
createRoot(document.getElementById('root')).render(<React.StrictMode><RouterProvider router={router} /></React.StrictMode>);
