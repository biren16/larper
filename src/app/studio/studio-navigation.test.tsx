import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { StudioNavigation } from './studio-navigation';
vi.mock('next/navigation',()=>({usePathname:()=>'/studio/candidates/example'}));
it('keeps the active admin destination and public exit explicit',()=>{
 render(<StudioNavigation environment="Production" destination="https://larper-social.vercel.app"/>);
 expect(screen.getByRole('link',{name:'Posts'})).toHaveAttribute('aria-current','page');
 expect(screen.getByRole('link',{name:'View website'})).toHaveAttribute('href','https://larper-social.vercel.app');
 expect(screen.getByText('Production')).toBeInTheDocument();
});
