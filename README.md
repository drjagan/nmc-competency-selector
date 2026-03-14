# NMC Competency Selector

A standalone React component library for selecting medical competencies from India's National Medical Commission (NMC) Competency-based Undergraduate Curriculum.

## Features

- **Fast Full-Text Search**: FTS5-powered search across ~2,600 competencies (<100ms)
- **Browse Interface**: Cascading Subject → Topic → Competency navigation
- **Tree View**: Interactive D3.js tree graph with domain-colored indicator dots
- **Rich Competency Display**: Color-coded domain badges (K=blue, S=green, A=amber), level badges, core badges, and expandable details showing teaching/assessment methods
- **Tag-Based Filtering**: Filter by domain, level, teaching method, and assessment method with a collapsible filter panel in Browse and Search views
- **Curriculum Versioning**: Support for multiple NMC curriculum versions (2019, 2024)
- **Search Button & Enter Key**: Submit search explicitly or auto-search while typing
- **Persistent Results**: Search results stay visible for easy multi-select
- **Tag Display**: Selected competencies shown as removable tags with rich tooltips
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
| `filters` | `CompetencyFilters` | - | Filter by subject/domain/level/methods |
| `className` | `string` | - | Container class |
| `version` | `string` | - | Curriculum version (e.g., "2019", "2024") |
| `onVersionChange` | `(version: string) => void` | - | Version change handler |

## CompetencyTag Type

```typescript
interface CompetencyTag {
  code: string;              // e.g., "AN1.1"
  text: string;              // Full competency text
  subjectCode?: string;      // e.g., "AN"
  subjectName: string;       // e.g., "Anatomy"
  topicName: string;         // Topic/module name
  domain?: string;           // K, S, A or combinations (K/S, K/S/A)
  level?: string;            // K, KH, SH, P or combinations
  isCore: boolean;           // Core competency flag
  teachingMethods?: string;  // Comma-separated (e.g., "LGT, SGT, DOAP")
  assessmentMethods?: string; // Comma-separated (e.g., "Written, Viva voce")
}
```

## CompetencyFilters Type

```typescript
interface CompetencyFilters {
  subject?: string | string[];    // Filter by subject code(s)
  topic?: string;                 // Filter by topic name
  domain?: string | string[];     // K, S, A (OR logic)
  level?: string[];               // K, KH, SH, P (OR logic)
  coreOnly?: boolean;             // Core competencies only
  searchQuery?: string;           // Text search query
  teachingMethod?: string[];      // e.g., ["LGT", "DOAP"] (AND logic)
  assessmentMethod?: string[];    // e.g., ["Viva voce", "Written"] (AND logic)
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

### v1.3.0
- **Rich Competency Display**: Color-coded domain badges (K=blue, S=green, A=amber), level badges, core badges across all views
- **Expandable Details**: Click chevron to reveal teaching methods, assessment methods, and topic as pill tags
- **Tag-Based Filtering**: Collapsible filter panel with domain/level checkboxes, core toggle, and teaching/assessment method multi-select dropdowns
- **Filter Logic**: OR logic for domain and level, AND logic for teaching and assessment methods
- **Enhanced Tooltips**: Hover tooltips now show teaching and assessment method pills
- **Tree View Domain Dots**: Colored SVG circles indicate competency domain in the tree visualization
- **Data Quality**: Fixed 500+ stuck-together words from PDF extraction using regex + AI cleanup, normalized teaching/assessment method values
- **New API Endpoint**: `GET /api/competencies/methods?type=teaching|assessment` for distinct method values
- **2024 Default**: CBME 2024 curriculum is now the default version

### v1.2.0
- **Curriculum Versioning**: Support for multiple NMC curriculum versions (2019, 2024)
- Version selector UI (hidden when only one version active)
- Separate database files per curriculum version
- All API endpoints support `?version=` parameter
- New props: `version`, `onVersionChange`

### v1.1.0
- Interactive D3.js tree graph viewer for competency exploration
- Expand/collapse nodes, pan/zoom controls
- Multi-select support from tree view
- Three-tab interface: Search | Browse | Tree View

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
