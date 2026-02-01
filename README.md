# NMC Competency Selector

A standalone React component library for selecting medical competencies from India's National Medical Commission (NMC) Competency-based Undergraduate Curriculum.

## Features

- **Fast Full-Text Search**: FTS5-powered search across ~5,000 competencies (<100ms)
- **Browse Interface**: Cascading Subject -> Topic -> Competency navigation
- **Tag Display**: Rich tooltips showing full competency details
- **Admin Interface**: CRUD operations with bulk import/export
- **SQLite Database**: Offline-capable with embedded database
- **Dark Mode**: Full dark mode support via shadcn/ui

## Installation

```bash
npm install @sbv/nmc-competency-selector
```

## Quick Start

```tsx
import { CompetencySelector } from "@sbv/nmc-competency-selector";
import { useState } from "react";
import type { CompetencyTag } from "@sbv/nmc-competency-selector";

function App() {
  const [selected, setSelected] = useState<CompetencyTag[]>([]);

  return (
    <CompetencySelector
      value={selected}
      onChange={setSelected}
      multiple={true}
      placeholder="Search for competencies..."
    />
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `CompetencyTag[]` | - | Controlled value |
| `onChange` | `(tags: CompetencyTag[]) => void` | - | Change handler |
| `multiple` | `boolean` | `true` | Allow multiple selections |
| `placeholder` | `string` | `"Search..."` | Input placeholder |
| `readOnly` | `boolean` | `false` | Read-only mode |
| `maxTags` | `number` | - | Maximum tags allowed |
| `filters` | `CompetencyFilters` | - | Filter by subject/domain |
| `className` | `string` | - | Container class |

## CompetencyTag Type

```typescript
interface CompetencyTag {
  code: string;          // e.g., "AN1.1"
  text: string;          // Full competency text
  subjectCode?: string;  // e.g., "AN"
  subjectName: string;   // e.g., "Anatomy"
  topicName: string;     // Topic/module name
  domain?: string;       // K/S/A or combinations
  level?: string;        // Bloom's level (1-4)
  isCore: boolean;       // Core competency flag
}
```

## Standalone App

Run as a standalone Next.js application:

```bash
# Install dependencies
npm install

# Initialize database (first time only)
npm run db:init

# Import competencies from Excel files
npm run db:import "/path/to/excel/files"

# Start development server
npm run dev
```

## Admin Interface

Enable admin routes by setting environment variable:

```bash
ADMIN_ENABLED=true npm run dev
```

Access admin at `/admin`:
- View/search all competencies
- Edit competency details
- Bulk import from Excel

## Database Schema

The component uses SQLite with the following structure:

- **subjects**: 19 NMC subjects (Anatomy, Physiology, etc.)
- **topics**: Subject-specific topics/modules
- **competencies**: Individual competency entries
- **competencies_fts**: FTS5 virtual table for search

## License

MIT License - Sri Balaji Vidyapeeth
