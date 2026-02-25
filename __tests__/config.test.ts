import { validateConfig, getDetailRoute } from '../src/config';
import { TestUser } from './testUtils';

// Simple mock axios
const mockAxios = {
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  create: jest.fn(),
  defaults: {},
  interceptors: {
    request: { use: jest.fn(), eject: jest.fn() },
    response: { use: jest.fn(), eject: jest.fn() }
  }
};

describe('config', () => {
  describe('validateConfig', () => {
    it('should validate basic config with default values', () => {
      const config = {
        axios: mockAxios,
        route: '/users',
      };

      const validated = validateConfig<'users', TestUser, typeof config>(config);

      expect(validated.detailKey).toBe('id');
      expect(validated.id).toBe('id');
      expect(validated.state).toEqual({});
      expect(validated.axios).toBe(mockAxios);
      expect(validated.onError).toBeNull();
      expect(validated.includeRecord).toBe(false);
      expect(validated.route).toBe('/users');
      expect(validated.customActions).toEqual({});
    });

    it('should validate config with custom values', () => {
      const mockOnError = jest.fn();
      const config = {
        axios: mockAxios,
        route: '/users',
        detailKey: 'userId',
        id: 'userId',
        state: { selectedId: null },
        onError: mockOnError,
        includeRecord: true,
      };

      const validated = validateConfig<'users', TestUser, typeof config>(config);

      expect(validated.detailKey).toBe('userId');
      expect(validated.id).toBe('userId');
      expect(validated.state).toEqual({ selectedId: null });
      expect(validated.onError).toBe(mockOnError);
      expect(validated.includeRecord).toBe(true);
    });

    it('should validate actions configuration', () => {
      const config = {
        axios: mockAxios,
        route: '/users',
        actions: {
          getList: true,
          create: true,
          get: false,
          update: { method: 'put' as const },
          delete: { route: '/users/delete' },
        },
      };

      const validated = validateConfig<'users', TestUser, typeof config>(config);

      expect(validated.actions.getList).toEqual({
        method: 'get',
        prepare: null,
        callback: null,
        onError: null,
        onResponse: null,

        route: '/users',
      });

      expect(validated.actions.create).toEqual({
        method: 'post',
        prepare: null,
        callback: null,
        onError: null,
        onResponse: null,

        route: '/users',
      });

      expect(validated.actions.get).toBeUndefined();

      expect(validated.actions.update).toEqual({
        method: 'put',
        prepare: null,
        callback: null,
        onError: null,
        onResponse: null,

        route: expect.any(Function),
      });

      expect(validated.actions.delete).toEqual({
        method: 'delete',
        prepare: null,
        callback: null,
        onError: null,
        onResponse: null,
        route: '/users/delete',
      });
    });

    it('should validate custom actions', () => {
      const config = {
        axios: mockAxios,
        route: '/users',
        customActions: {
          activate: {
            route: '/users/activate',
            method: 'post' as const,
          },
          deactivate: {
            route: (user: TestUser) => `/users/${user.id}/deactivate`,
            method: 'delete' as const,
          },
        },
      };

      const validated = validateConfig<'users', TestUser, typeof config>(config);

      expect(validated.customActions.activate).toEqual({
        route: '/users/activate',
        method: 'post',
        onError: null,
      });

      expect(validated.customActions.deactivate).toEqual({
        route: expect.any(Function),
        method: 'delete',
        onError: null,
      });
    });

    it('should default detailKey to id, not the other way around', () => {
      // Only id set → detailKey defaults to id
      const configIdOnly = {
        axios: mockAxios,
        route: '/users',
        id: 'uuid',
      };
      const v1 = validateConfig<'users', TestUser, typeof configIdOnly>(configIdOnly);
      expect(v1.id).toBe('uuid');
      expect(v1.detailKey).toBe('uuid');

      // Only detailKey set → id stays at 'id'
      const configDetailKeyOnly = {
        axios: mockAxios,
        route: '/users',
        detailKey: 'slug',
      };
      const v2 = validateConfig<'users', TestUser, typeof configDetailKeyOnly>(configDetailKeyOnly);
      expect(v2.id).toBe('id');
      expect(v2.detailKey).toBe('slug');

      // Both set → both explicit
      const configBoth = {
        axios: mockAxios,
        route: '/users',
        id: 'uuid',
        detailKey: 'slug',
      };
      const v3 = validateConfig<'users', TestUser, typeof configBoth>(configBoth);
      expect(v3.id).toBe('uuid');
      expect(v3.detailKey).toBe('slug');

      // Neither set → both 'id'
      const configNeither = {
        axios: mockAxios,
        route: '/users',
      };
      const v4 = validateConfig<'users', TestUser, typeof configNeither>(configNeither);
      expect(v4.id).toBe('id');
      expect(v4.detailKey).toBe('id');
    });
  });

  describe('getDetailRoute', () => {
    it('should create detail route function for string routes', () => {
      const routeFunc = getDetailRoute('/users', 'id');
      
      expect(typeof routeFunc).toBe('function');
      expect(routeFunc({ id: 123 })).toBe('/users/123');
      expect(routeFunc(123)).toBe('/users/123');
    });

    it('should handle routes with trailing slash', () => {
      const routeFunc = getDetailRoute('/users/', 'id');
      
      expect(routeFunc({ id: 123 })).toBe('/users/123/');
    });

    it('should handle routes without trailing slash', () => {
      const routeFunc = getDetailRoute('/users', 'id');
      
      expect(routeFunc({ id: 123 })).toBe('/users/123');
    });

    it('should work with custom id field', () => {
      const routeFunc = getDetailRoute('/users', 'userId');
      
      expect(routeFunc({ userId: 456 })).toBe('/users/456');
    });

    it('should return original function if route is already a function', () => {
      const originalFunc = (data: any) => `/custom/${data.id}`;
      const routeFunc = getDetailRoute(originalFunc, 'id');
      
      expect(routeFunc).toBe(originalFunc);
    });
  });
});
