# ReusableTabsPager

A tab component with pager support: swipe gestures, animation, lazy loading, and flexible customization.

## Features

- ✅ **Swipe between tabs** — Smooth swipe gestures
- ✅ **Underline animation** — Underline moves with scroll
- ✅ **Lazy loading** — Renders a tab only when needed
- ✅ **Auto-center active tab** — The active tab scrolls into the center automatically
- ✅ **Customizable colors and styles** — Flexible styling options
- ✅ **Right action** — Add a button or icon in the top-right of the header
- ✅ **Custom label render** — Control how each label is displayed

## Basic Usage

```tsx
import ReusableTabsPager, { TabItem } from '@/components/shared/Pager/ReusableTabsPager';

const MyScreen = () => {
  const tabs: TabItem[] = [
    {
      key: 'tab1',
      label: 'Tab 1',
      render: (
        <View>
          <Text>Content 1</Text>
        </View>
      ),
    },
    {
      key: 'tab2',
      label: 'Tab 2',
      render: (
        <View>
          <Text>Content 2</Text>
        </View>
      ),
    },
    {
      key: 'tab3',
      label: 'Tab 3',
      render: (
        <View>
          <Text>Content 3</Text>
        </View>
      ),
    },
  ];

  return <ReusableTabsPager tabs={tabs} />;
};
```

## Props

### Required Props

| Prop   | Type        | Description                                      |
| ------ | ----------- | ------------------------------------------------ |
| `tabs` | `TabItem[]` | Array of tab items (see TabItem structure below) |

### Optional Props

| Prop                | Type                   | Default         | Description                                            |
| ------------------- | ---------------------- | --------------- | ------------------------------------------------------ |
| `defaultIndex`      | `number`               | `0`             | Default tab index on mount                             |
| `lazy`              | `boolean`              | `true`          | Enable lazy loading — only render visited tabs         |
| `placeholder`       | `ReactNode`            | Loading spinner | Shown when a tab has not been rendered yet (lazy mode) |
| `containerStyle`    | `ViewStyle`            | `{ flex: 1 }`   | Style for the main container                           |
| `headerBorderColor` | `string`               | `'#E5E7EB'`     | Bottom border color of the header                      |
| `activeColor`       | `string`               | `'#2563eb'`     | Text color of the active tab                           |
| `inactiveColor`     | `string`               | `'#4B5563'`     | Text color of inactive tabs                            |
| `underlineColor`    | `string`               | `'#2563eb'`     | Color of the active tab underline                      |
| `rightAction`       | `ReactNode`            | `undefined`     | Component rendered on the right side of the header     |
| `onIndexChange`     | `(index, tab) => void` | `undefined`     | Callback when the active tab changes                   |

## TabItem Structure

```tsx
type TabItem = {
  key: string; // Unique key (required)
  label: string; // Tab label text (required)
  render: ReactNode | (() => ReactNode); // Tab content (required)
  renderLabel?: (isActive: boolean) => ReactNode; // Custom label render (optional)
};
```

## Advanced Examples

### 1. With Right Action (Filter / Sort Button)

```tsx
const tabs = [...]; // your tabs

<ReusableTabsPager
  tabs={tabs}
  rightAction={
    <TouchableOpacity onPress={() => console.log('Filter')}>
      <Icon name="filter" size={20} color="#6B7280" />
    </TouchableOpacity>
  }
/>
```

### 2. Custom Label Render

```tsx
const tabs: TabItem[] = [
  {
    key: 'favorites',
    label: 'Favorites',
    renderLabel: (isActive) => (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Star size={16} color={isActive ? '#2563eb' : '#6B7280'} />
        <Text style={{ color: isActive ? '#2563eb' : '#6B7280', marginLeft: 4 }}>Favorites</Text>
      </View>
    ),
    render: <FavoritesContent />,
  },
  // ... other tabs
];

<ReusableTabsPager tabs={tabs} />;
```

### 3. With Function Render (Dynamic Content)

```tsx
const tabs: TabItem[] = [
  {
    key: 'markets',
    label: 'Markets',
    render: () => {
      // Fetch data or other logic here
      const data = useMarketData();
      return <MarketList data={data} />;
    },
  },
  // ... other tabs
];
```

### 4. Custom Colors & Styles

```tsx
<ReusableTabsPager
  tabs={tabs}
  activeColor="#10B981"
  inactiveColor="#9CA3AF"
  underlineColor="#10B981"
  headerBorderColor="#E5E7EB"
  containerStyle={{ backgroundColor: '#F9FAFB' }}
/>
```

### 5. Disable Lazy Loading

```tsx
<ReusableTabsPager
  tabs={tabs}
  lazy={false} // Render all tabs immediately
/>
```

### 6. Custom Placeholder for Lazy Tabs

```tsx
<ReusableTabsPager
  tabs={tabs}
  lazy={true}
  placeholder={
    <View style={{ padding: 20 }}>
      <ActivityIndicator color="#2563eb" />
      <Text style={{ marginTop: 10, textAlign: 'center' }}>Loading...</Text>
    </View>
  }
/>
```

### 7. Track Tab Changes

```tsx
<ReusableTabsPager
  tabs={tabs}
  onIndexChange={(index, tab) => {
    console.log('Changed to:', tab.label, 'at index:', index);
    // Track analytics, update state, etc.
  }}
/>
```

### 8. Set Default Tab

```tsx
<ReusableTabsPager
  tabs={tabs}
  defaultIndex={2} // Start at the 3rd tab
/>
```

## Real-World Example

```tsx
import { Star, TrendingUp, Clock } from '@untitledui/icons-native';

const MarketScreen = () => {
  const tabs: TabItem[] = [
    {
      key: 'favorites',
      label: 'Favorites',
      renderLabel: (isActive) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Star size={16} color={isActive ? '#2563eb' : '#6B7280'} />
          <Text style={{ color: isActive ? '#2563eb' : '#6B7280' }}>Favorites</Text>
        </View>
      ),
      render: () => <FavoritesList />,
    },
    {
      key: 'trending',
      label: 'Trending',
      renderLabel: (isActive) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <TrendingUp size={16} color={isActive ? '#2563eb' : '#6B7280'} />
          <Text style={{ color: isActive ? '#2563eb' : '#6B7280' }}>Trending</Text>
        </View>
      ),
      render: () => <TrendingList />,
    },
    {
      key: 'recent',
      label: 'Recent',
      renderLabel: (isActive) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Clock size={16} color={isActive ? '#2563eb' : '#6B7280'} />
          <Text style={{ color: isActive ? '#2563eb' : '#6B7280' }}>Recent</Text>
        </View>
      ),
      render: () => <RecentList />,
    },
  ];

  const [filterMode, setFilterMode] = useState('all');

  return (
    <ReusableTabsPager
      tabs={tabs}
      defaultIndex={0}
      activeColor="#2563eb"
      inactiveColor="#6B7280"
      underlineColor="#2563eb"
      rightAction={
        <TouchableOpacity onPress={() => setFilterMode('filtered')}>
          <Icon name="filter" size={20} color="#6B7280" />
        </TouchableOpacity>
      }
      onIndexChange={(index, tab) => {
        console.log('Switched to:', tab.label);
      }}
    />
  );
};
```

## Tips & Best Practices

1. **Unique keys**: Ensure each tab has a unique `key`.
2. **Lazy loading**: Use `lazy={true}` for better performance when there are many tabs.
3. **Performance**: Wrap tab content with `React.memo()` when appropriate.
4. **Content height**: Content inside a tab scrolls automatically if it exceeds the screen.
5. **Animation**: The underline animation uses the native driver for smooth performance.
6. **Initial scroll**: The component scrolls the header so the active tab is centered.

## Performance Optimization

```tsx
// Memoize tab content to avoid unnecessary re-renders
const FavoritesList = React.memo(() => {
  const data = useFavorites();
  return <FlatList data={data} {...props} />;
});

const tabs: TabItem[] = [
  {
    key: 'favorites',
    label: 'Favorites',
    render: <FavoritesList />, // Wrapped with memo
  },
  // ... other tabs
];
```

## Notes

- The component uses `Animated.FlatList` for the content pager.
- The header scrolls automatically so the active tab stays centered.
- RTL (right-to-left) layouts are supported.
- Compatible with React Native 0.60+.
- Full TypeScript support.
