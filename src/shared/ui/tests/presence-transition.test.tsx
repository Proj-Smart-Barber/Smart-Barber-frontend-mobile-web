// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { Animated } from 'react-native';
import { usePresenceTransition } from '../use-presence-transition';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it('keeps a closing surface mounted until its exit completes', () => {
  const completions: Array<(value: {finished:boolean}) => void> = [];
  vi.spyOn(Animated,'timing').mockImplementation(() => ({start: callback => {if(callback) completions.push(callback);}, stop:vi.fn(),reset:vi.fn()}));
  const {result,rerender} = renderHook(({open}) => usePresenceTransition(open,{enterDuration:300,exitDuration:220,reducedMotion:false}),{initialProps:{open:true}});
  rerender({open:false});
  expect(result.current.mounted).toBe(true);
  act(() => completions[1]({finished:true}));
  expect(result.current.mounted).toBe(false);
});
it('ignores an obsolete exit completion after reopening', () => {
  const completions: Array<(value: {finished:boolean}) => void> = [];
  vi.spyOn(Animated,'timing').mockImplementation(() => ({start: callback => {if(callback) completions.push(callback);}, stop:vi.fn(),reset:vi.fn()}));
  const {result,rerender} = renderHook(({open}) => usePresenceTransition(open,{enterDuration:300,exitDuration:220,reducedMotion:false}),{initialProps:{open:true}});
  rerender({open:false}); rerender({open:true});
  act(() => completions[1]({finished:true}));
  expect(result.current.mounted).toBe(true);
});
it('closes immediately with reduced motion and no decorative animation', () => {
  const timing=vi.spyOn(Animated,'timing');
  const {result,rerender}=renderHook(({open})=>usePresenceTransition(open,{enterDuration:300,exitDuration:220,reducedMotion:true}),{initialProps:{open:true}});
  rerender({open:false});
  expect(result.current.mounted).toBe(false);expect(timing).not.toHaveBeenCalled();
});
