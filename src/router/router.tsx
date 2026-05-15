import { createBrowserRouter } from 'react-router-dom'

import Home from '../pages/Home'
import MergePage from '../pages/MergePage'
import SplitPage from '../pages/SplitPage'
import CompressPage from '../pages/CompressPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />
  },
  {
    path: '/merge-pdf',
    element: <MergePage />
  },
  {
    path: '/split-pdf',
    element: <SplitPage />
  },
  {
    path: '/compress-pdf',
    element: <CompressPage />
  }
])
