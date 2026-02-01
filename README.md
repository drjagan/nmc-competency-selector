# NMC Competency Selector

A standalone React component library for selecting medical competencies from India's National Medical Commission (NMC) Competency-based Undergraduate Curriculum.

## Features

- **Fast Full-Text Search**: FTS5-powered search across ~3,000 competencies (<100ms)
- **Browse Interface**: Cascading Subject → Topic → Competency navigation
- **Search Button & Enter Key**: Submit search explicitly or auto-search while typing
- **Persistent Results**: Search results stay visible for easy multi-select
- **Tag Display**: Selected competencies shown as removable tags
- **Admin Interface**: CRUD operations with bulk import/export
- **SQLite Database**: Offline-capable with embedded database
- **Dark Mode**: Full dark mode support via shadcn/ui

## Installation

```bash
npm install @academe/nmc-competency-selector
```

## Quick Start

```tsx
import { CompetencySelector } from "@academe/nmc-competency-selector";
import { useState } from "react";
import type { CompetencyTag } from "@academe/nmc-competency-selector";

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

## Changelog

### v1.0.0
- Initial release
- Full-text search with FTS5
- Browse interface with cascading dropdowns
- Search button and Enter key support
- Persistent search results for multi-select
- Admin interface for CRUD operations
- SQLite database with ~3,000 NMC competencies

## License

MIT License - Academe CBME

---

Built for Medical Education by [Academe CBME](https://academe.co.in)
