import {describe,it,expect,vi,beforeEach} from 'vitest';
const mocks=vi.hoisted(()=>({post:vi.fn()}));
vi.mock('@/services/apiClient',()=>({apiClient:{postWithResponse:mocks.post}}));
vi.mock('@/constants/env',()=>({API_BASE_URL:'https://backend.example.invalid'}));
vi.mock('@/app/api/_utils/auth',()=>({getAccessTokenFromRequest:()=> 'access-token',clearAuthCookies:vi.fn(),successResponse:(value:unknown)=>Response.json(value)}));
import {POST} from './route';
beforeEach(()=>vi.clearAllMocks());
describe('logout revokes the browser refresh session',()=>{
 it('forwards only the refresh cookie so the backend can revoke its bound push subscription',async()=>{
  mocks.post.mockResolvedValue({});await POST(new Request('https://app.example.invalid/api/auth/logout',{method:'POST',headers:{cookie:'theme=dark; refresh_token=private-refresh; unrelated=ignored'}}));
  expect(mocks.post).toHaveBeenCalledWith('auth/logout',undefined,expect.objectContaining({headers:{Authorization:'Bearer access-token',Cookie:'refresh_token=private-refresh'}}));
 });
 it('still clears browser cookies when the backend is unavailable',async()=>{
  mocks.post.mockRejectedValue(new Error('unavailable'));expect((await POST(new Request('https://app.example.invalid/api/auth/logout',{method:'POST'}))).status).toBe(200);
 });
});
