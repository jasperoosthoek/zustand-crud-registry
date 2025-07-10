# Zustand CRUD Registry

[![npm version](https://badge.fury.io/js/%40jasperoosthoek%2Fzustand-crud-registry.svg)](https://badge.fury.io/js/%40jasperoosthoek%2Fzustand-crud-registry)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

> **Effortless CRUD operations for React applications with automatic state management, loading states, and type safety.**

Transform your React frontend into a powerful data management interface with just a few lines of code. This library combines **Zustand** state management with **Axios** HTTP client to provide reactive, type-safe CRUD operations that automatically sync your UI with your backend.

## Key Features

- **Automatic State Sync** - Backend changes instantly reflect in your React components
- **Type-Safe Operations** - Full TypeScript support with intelligent autocompletion
- **Built-in Loading States** - No more manual loading/error state management
- **Zero Boilerplate** - Set up complete CRUD operations in minutes
- **Flexible Configuration** - Custom actions, routes, and data transformation
- **Normalized Storage** - Efficient data storage and updates
- **React Hooks** - Clean, composable API for your components

## Quick Start

### Installation

```bash
npm install @jasperoosthoek/zustand-crud-registry zustand axios
```

### Basic Setup

```typescript
// stores/registry.ts
import { createStoreRegistry } from "@jasperoosthoek/zustand-crud-registry";
import axios from "axios";

// Define your data types
export type User = {
  id: number;
  name: string;
  email: string;
};

export type Post = {
  id: number;
  title: string;
  content: string;
  userId: number;
};

// Create the store registry (only once in your app)
export const getOrCreateStore = createStoreRegistry<{
  users: User;
  posts: Post;
}>();

// Set up your HTTP client
const api = axios.create({ baseURL: '/api' });

// Create your stores
export const usersStore = getOrCreateStore('users', {
  axios: api,
  route: '/users',
  actions: {
    getList: true,
    create: true,
    update: true,
    delete: true,
  },
});

export const postsStore = getOrCreateStore('posts', {
  axios: api,
  route: '/posts',
  actions: {
    getList: true,
    create: true,
    update: true,
    delete: true,
  },
});
```

### Using in Components

```typescript
// components/UsersList.tsx
import React, { useEffect } from 'react';
import { useCrud } from "@jasperoosthoek/zustand-crud-registry";
import { usersStore } from '../stores/registry';

export const UsersList = () => {
  const users = useCrud(usersStore);

  useEffect(() => {
    if (!users.list) {
      users.getList();
    }
  }, []);

  const handleCreateUser = () => {
    users.create({
      name: 'New User',
      email: 'user@example.com'
    });
  };

  const handleDeleteUser = (user: User) => {
    users.delete(user);
  };

  if (users.getList.isLoading) {
    return <div>Loading users...</div>;
  }

  if (users.getList.error) {
    return <div>Error: {users.getList.error.message}</div>;
  }

  return (
    <div>
      <button onClick={handleCreateUser} disabled={users.create.isLoading}>
        {users.create.isLoading ? 'Creating...' : 'Add User'}
      </button>
      
      <div>
        {users.list?.map(user => (
          <div key={user.id} className="user-item">
            <span>{user.name} - {user.email}</span>
            <button 
              onClick={() => handleDeleteUser(user)}
              disabled={users.delete.isLoading && users.delete.id === user.id}
            >
              {users.delete.isLoading && users.delete.id === user.id ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
```

## Complete Examples

### Advanced Store Configuration

```typescript
// stores/advanced.ts
import { createStoreRegistry } from "@jasperoosthoek/zustand-crud-registry";
import axios from "axios";

export type Task = {
  id: number;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  order: number;
};

export const getOrCreateStore = createStoreRegistry<{
  tasks: Task;
}>();

const api = axios.create({ 
  baseURL: '/api',
  headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
});

export const tasksStore = getOrCreateStore('tasks', {
  axios: api,
  route: '/tasks',
  actions: {
    getList: {
      method: 'post', // Custom HTTP method
      route: '/tasks/search', // Custom route
    },
    create: true,
    update: true,
    delete: true,
  },
  // Custom actions for additional endpoints
  customActions: {
    reorder: {
      route: ({ id }: Task) => `/tasks/${id}/reorder`,
      method: 'patch',
    },
    toggleComplete: {
      route: ({ id }: Task) => `/tasks/${id}/toggle`,
      method: 'post',
    },
  },
  // Component state (separate from server data)
  state: {
    selectedTaskId: null as number | null,
    filterBy: 'all' as 'all' | 'completed' | 'pending',
  },
  // Error handling
  onError: (error) => {
    console.error('Task operation failed:', error);
    // Could integrate with toast notifications, etc.
  },
});
```

### Component with Custom Actions

```typescript
// components/TaskManager.tsx
import React, { useEffect } from 'react';
import { useCrud } from "@jasperoosthoek/zustand-crud-registry";
import { tasksStore } from '../stores/advanced';

export const TaskManager = () => {
  const tasks = useCrud(tasksStore);

  useEffect(() => {
    tasks.getList();
  }, []);

  const handleToggleComplete = (task: Task) => {
    // Custom action usage
    tasks.toggleComplete(task);
  };

  const handleFilterChange = (filter: 'all' | 'completed' | 'pending') => {
    // Update component state
    tasks.setState({ filterBy: filter });
  };

  const filteredTasks = tasks.list?.filter(task => {
    if (tasks.state.filterBy === 'completed') return task.completed;
    if (tasks.state.filterBy === 'pending') return !task.completed;
    return true;
  });

  return (
    <div>
      <div>
        <button onClick={() => handleFilterChange('all')}>All</button>
        <button onClick={() => handleFilterChange('completed')}>Completed</button>
        <button onClick={() => handleFilterChange('pending')}>Pending</button>
      </div>

      <div>
        {filteredTasks?.map(task => (
          <div key={task.id} className="task-item">
            <span>{task.title}</span>
            <button 
              onClick={() => handleToggleComplete(task)}
              disabled={tasks.toggleComplete.isLoading && tasks.toggleComplete.id === task.id}
            >
              {task.completed ? 'Mark Pending' : 'Mark Complete'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### Custom Response Handling

```typescript
// hooks/useTasksWithReorder.ts
import { useCrud, useStore } from "@jasperoosthoek/zustand-crud-registry";
import { tasksStore } from '../stores/advanced';

export const useTasksWithReorder = () => {
  const tasks = useCrud(tasksStore);
  const { patchList } = useStore(tasksStore);

  // Handle reorder response
  tasks.reorder.onResponse = (reorderedTasks: Partial<Task>[]) => {
    // Update only the order fields without refetching
    patchList(reorderedTasks);
  };

  return tasks;
};
```

## API Reference

### `createStoreRegistry<Models>()`

Creates a store registry function. Call this **only once** in your application.

**Parameters:**
- `Models`: TypeScript type defining your entity models

**Returns:** `getOrCreateStore` function

### `getOrCreateStore(key, config)`

Creates or retrieves a store for a specific entity type.

**Parameters:**
- `key`: String key matching your Models type
- `config`: Store configuration object

**Config Options:**
```typescript
{
  axios: AxiosInstance;           // HTTP client instance
  route: string | RouteFunction;  // Base API route
  actions?: {                     // Enable/configure CRUD operations
    getList?: boolean | ActionConfig;
    get?: boolean | ActionConfig;
    create?: boolean | ActionConfig;
    update?: boolean | ActionConfig;
    delete?: boolean | ActionConfig;
  };
  customActions?: {               // Custom API endpoints
    [name: string]: CustomActionConfig;
  };
  state?: object;                 // Component state
  onError?: (error: any) => void; // Error handler
  id?: string;                    // ID field name (default: 'id')
  includeRecord?: boolean;        // Include record object in hook
}
```

### `useCrud(store)`

Main hook for interacting with your store.

**Returns:**
```typescript
{
  list: T[] | null;                    // Array of entities or null when no entities have been stored yet
  count: number;                       // Total count which will differ in case of pagination

  record?: {[id: string]: T} | null;    // Object of entities by id of how data is stored internally (if enabled)

  // CRUD operations (if enabled)
  getList: AsyncFunction;
  get: AsyncFunction;
  create: AsyncFunction;
  update: AsyncFunction;
  delete: AsyncFunction;
  
  // Custom actions
  [customAction]: AsyncFunction;
  
  // State management (if configured)
  state: StateObject;
  setState: (partial: Partial<StateObject>) => void;
  
  // Loading states for each operation
  // Each operation has: isLoading, error, response, id
}
```

### `useStore(store)`

Lower-level hook providing direct access to store functions.

**Returns:** Complete store state and functions

## Advanced Usage

### Route Functions

```typescript
// Dynamic routes based on data
const store = getOrCreateStore('posts', {
  axios: api,
  route: '/posts',
  actions: {
    getList: {
      route: ({ userId }: { userId: number }) => `/users/${userId}/posts`
    },
    update: {
      method: 'put',            // Use custom http method instead of default patch
      route: (post: Post) => `/posts/${post.id}/update`
    }
  }
});
```

### Data Transformation

```typescript
// Transform data before sending to API
const store = getOrCreateStore('users', {
  axios: api,
  route: '/users',
  actions: {
    create: {
      prepare: (userData) => ({
        ...userData,
        createdAt: new Date().toISOString()
      })
    }
  }
});
```

### Error Handling

```typescript
const store = getOrCreateStore('users', {
  axios: api,
  route: '/users',
  onError: (error) => {
    if (error.response?.status === 401) {
      // Handle authentication error
      redirectToLogin();
    } else {
      // Show error notification
      showErrorToast(error.message);
    }
  }
});
```

## 🛠️ Best Practices

### 1. Store Organization

```typescript
// stores/index.ts - Export all stores from one place
export * from './users';
export * from './posts';
export * from './registry';
```

### 2. Default Configuration

```typescript
// stores/config.ts - Reuse common configuration
export const defaultConfig = {
  axios: apiClient,
  actions: {
    getList: true,
    create: true,
    update: true,
    delete: true,
  },
  onError: handleApiError,
};

// stores/users.ts
export const usersStore = getOrCreateStore('users', {
  ...defaultConfig,
  route: '/users',
});
```

### 3. Custom Hooks

```typescript
// hooks/useUsers.ts - Wrap logic in custom hooks
export const useUsers = () => {
  const users = useCrud(usersStore);
  
  useEffect(() => {
    if (!users.list) {
      users.getList();
    }
  }, []);
  
  return users;
};
```

### 4. Type Safety

```typescript
// types/api.ts - Define your API types
export interface User {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
}
```

## Troubleshooting

### Common Issues

**Q: TypeScript errors about store types**
```typescript
// ❌ Don't do this - creates multiple registries
const store1 = createStoreRegistry<{...}>()('users', config);
const store2 = createStoreRegistry<{...}>()('posts', config);

// ✅ Do this - single registry
const getOrCreateStore = createStoreRegistry<{...}>();
const store1 = getOrCreateStore('users', config);
const store2 = getOrCreateStore('posts', config);
```

**Q: Actions not working**
```typescript
// ❌ Make sure actions are enabled
const store = getOrCreateStore('users', {
  axios: api,
  route: '/users',
  // actions: { ... } // Missing actions config
});

// ✅ Enable the actions you need
const store = getOrCreateStore('users', {
  axios: api,
  route: '/users',
  actions: {
    getList: true,
    create: true,
    // ... other actions
  }
});
```

**Q: Loading states not updating**
```typescript
// ❌ Don't destructure loading states
const { getList, getList: { isLoading } } = useCrud(store);

// ✅ Access loading states directly
const users = useCrud(store);
const isLoading = users.getList.isLoading;
```

## Examples & Demos

- **[Live Demo](https://dashboard-demo-olive-eight.vercel.app/)** - Complete dashboard application
- **[Dashboard Demo Repository](https://github.com/jasperoosthoek/dashboard-demo)** - Example dashboard project with examples

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/jasperoosthoek/zustand-crud-registry.git

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

## License

MIT © [jasperoosthoek](https://github.com/jasperoosthoek)

## Acknowledgments

- Built with [Zustand](https://github.com/pmndrs/zustand) for state management
- HTTP client powered by [Axios](https://github.com/axios/axios)
- Inspired by the need for simpler CRUD operations in React applications

---

**Made with ❤️ by [@jasperoosthoek](https://github.com/jasperoosthoek)**