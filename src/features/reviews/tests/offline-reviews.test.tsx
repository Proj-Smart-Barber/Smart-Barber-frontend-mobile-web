// @vitest-environment happy-dom
import React from 'react';
import {render,screen,cleanup} from '@testing-library/react';
import {it,expect,vi,afterEach} from 'vitest';
import {ThemeProvider} from '@/shared/theme';
const state=vi.hoisted(() => ({data:undefined as any,fetchStatus:'paused',isLoading:false,error:null}));
vi.mock('../model/use-reviews',()=>({useBarbershopReviews:()=>state,useReportReview:()=>({isPending:false,mutateAsync:vi.fn()})}));
vi.mock('expo-router',()=>({useRouter:()=>({push:vi.fn()})}));
vi.mock('expo-blur',()=>({BlurView:({children}:React.PropsWithChildren)=><div>{children}</div>}));
vi.mock('expo-haptics',()=>({impactAsync:vi.fn(),ImpactFeedbackStyle:{Light:'light'}}));
vi.mock('@expo/vector-icons',()=>({Ionicons:()=>null}));
import {BarbershopReviewsList} from '../ui/BarbershopReviewsList';
afterEach(cleanup);
it('distinguishes unavailable offline reviews from a successful empty result',() => {
 state.data=undefined;state.fetchStatus='paused';
 const view=render(<ThemeProvider><BarbershopReviewsList shopId="synthetic" /></ThemeProvider>);
 expect(screen.getByText(/Avaliações indisponíveis sem conexão/)).toBeDefined();
 expect(screen.queryByText('Ainda sem avaliações')).toBeNull();
 state.data={reviews:[],averageRating:0,reviewCount:0};state.fetchStatus='idle';
 view.rerender(<ThemeProvider><BarbershopReviewsList shopId="synthetic" /></ThemeProvider>);
 expect(screen.getByText('Ainda sem avaliações')).toBeDefined();
});
