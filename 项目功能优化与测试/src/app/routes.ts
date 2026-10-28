import { createBrowserRouter } from 'react-router';
import { Root } from '../layouts/Root';
import { Home } from '../pages/Home';
import { Search } from '../pages/Search';
import { Publish } from '../pages/Publish';
import { Detail } from '../pages/Detail';
import { Mine } from '../pages/Mine';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Root,
    children: [
      { index: true, Component: Home },
      { path: 'search', Component: Search },
      { path: 'mine', Component: Mine },
    ],
  },
  { path: '/publish', Component: Publish },
  { path: '/detail/:id', Component: Detail },
]);
