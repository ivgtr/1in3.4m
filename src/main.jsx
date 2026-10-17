import React from 'react';
import { createRoot } from 'react-dom/client';
import { createHashHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import { AppLayout, AboutPage, GamePage, HistoryPage } from './App.jsx';
import { GameProvider } from './game/GameProvider.jsx';
import './styles.css';

const rootRoute = createRootRoute({
  component: () => <GameProvider><AppLayout /></GameProvider>,
  errorComponent: ({ error }) => <main className="page"><h1>画面を開けませんでした。</h1><p role="alert">{error.message}</p><button onClick={() => location.reload()}>再読み込み</button></main>,
  notFoundComponent: () => <main className="page"><h1>このページはありません。</h1><a href="#/">会社へ戻る</a></main>,
});
const routes = [
  createRoute({ getParentRoute: () => rootRoute, path: '/', component: GamePage }),
  createRoute({ getParentRoute: () => rootRoute, path: '/history', component: HistoryPage }),
  createRoute({ getParentRoute: () => rootRoute, path: '/about', component: AboutPage }),
];
const router = createRouter({ routeTree: rootRoute.addChildren(routes), history: createHashHistory() });
createRoot(document.getElementById('root')).render(<React.StrictMode><RouterProvider router={router} /></React.StrictMode>);
