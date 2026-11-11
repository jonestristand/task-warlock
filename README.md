# TaskWarlock 🧙‍♂️

A modern, beautiful web interface for [TaskWarrior](https://taskwarrior.org/) built with Next.js 15, React, and TypeScript. Manage your tasks with a sleek UI featuring multiple theme options, real-time filtering, and inline editing.

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

## ✨ Features

- **Beautiful Themes** - 14+ carefully crafted themes including Catppuccin, Kanagawa, Rose Pine, Dracula, Tokyo Night, One Dark, Everforest, and Nord
- **Real-time Task Management** - Add, edit, complete, and restore tasks with instant feedback
- **Smart Filtering** - Filter by project, tags, and completion status
- **Inline Editing** - Click any task row to edit all fields in place
- **Priority & Urgency** - Visual priority indicators and urgency-based font weights
- **Tag Management** - Easy tag selection with autocomplete
- **Responsive Design** - Works seamlessly on desktop and mobile
- **Docker Support** - Pre-configured Dockerfile and docker-compose.yml for easy deployment
- **No Flicker Loading** - Theme persistence and skeleton loaders for smooth UX

## 🚀 Quick Start

### Prerequisites

- Node.js 22+ or Docker
- TaskWarrior 3.4.2+ installed locally (for development without Docker)

### Development

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/taskwarlock.git
cd taskwarlock
```

2. **Install dependencies**
```bash
npm install
```

3. **Run the development server**
```bash
npm run dev
```

4. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

### Docker Deployment

1. **Build the image**
```bash
docker build -t taskwarlock:latest .
```

2. **Run with docker-compose**
```bash
docker-compose up -d
```

3. **Or run directly**
```bash
docker run -p 3000:3000 \
  -v ./taskwarrior-data:/home/nextjs/.task \
  taskwarlock:latest
```

The Docker image includes:
- TaskWarrior 3.4.2 pre-installed
- Default `.taskrc` with `data.location` and `recurrence=off`
- Automatic cron-based `task sync` (every minute by default; set `TASK_SYNC_SCHEDULE` to a cron expression, or `off` if you don't use a sync server)
- Persistent data storage via volume mounts

### Persisting Settings

To persist your theme and app settings across container restarts, map the settings directory:

```bash
docker run -p 3000:3000 \
  -v ./taskwarrior-data:/home/nextjs/.task \
  -v ./taskwarlock-settings:/root/.taskwarlock \
  taskwarlock:latest
```

Or in `docker-compose.yml`:
```yaml
services:
  taskwarlock:
    volumes:
      - ./taskwarrior-data:/home/nextjs/.task
      - ./taskwarlock-settings:/root/.taskwarlock
```

This will persist:
- Selected theme preference
- UI settings and preferences
- Filter states

See `docker-compose.yml` for more configuration options.

## 🎨 Themes

TaskWarlock includes 14 beautiful themes:

**Dark Themes:**
- Catppuccin Mocha 🌙
- Dracula 🧛
- Everforest 🌲
- Kanagawa Wave 🌊
- Kanagawa Dragon 🐉
- Nord 🌌
- One Dark ⚛️
- Rose Pine 🌹
- Rose Pine Moon 🌕
- Tokyo Night 🌃

**Light Themes:**
- Catppuccin Latte ☕
- Kanagawa Lotus 🪷
- Nord Light ☀️
- Rose Pine Dawn 🌸

Themes are persisted to localStorage and apply instantly without flickering.

## 📁 Project Structure

```
taskwarlock/
├── src/
│   ├── app/                    # Next.js app router
│   │   ├── layout.tsx         # Root layout with providers
│   │   ├── page.tsx           # Main page
│   │   └── globals.css        # Global styles & theme definitions
│   ├── components/            # React components
│   │   ├── providers/         # Context providers
│   │   ├── ui/                # shadcn/ui components
│   │   ├── TaskDashboard.tsx  # Main dashboard
│   │   ├── TaskTable.tsx      # Task table with skeleton loading
│   │   ├── TaskTableRow.tsx   # Editable task row
│   │   └── ThemeSelector.tsx  # Theme picker
│   └── lib/                   # Utilities & business logic
│       ├── taskwarrior-cli.ts # TaskWarrior CLI interface
│       ├── task-queries.ts    # TanStack Query hooks
│       └── utils.ts           # Helper functions
├── Dockerfile                 # Production Docker image
├── docker-compose.yml         # Sample Docker Compose config
└── components.json            # shadcn/ui configuration
```

## 🔧 Configuration

### TaskWarrior Configuration

By default, the Docker image uses:
```
data.location=/home/nextjs/.task
recurrence=off
```

To use your own TaskWarrior configuration:

1. **Mount a custom `.taskrc`:**
```yaml
volumes:
  - ./my-taskrc:/home/nextjs/.taskrc:ro
```

2. **Enable TaskWarrior sync:**
Add to your custom `.taskrc`:
```
taskd.server=<your-server>
taskd.credentials=<your-credentials>
taskd.certificate=<path-to-cert>
```

### Theme Customization

Themes are defined in `src/app/globals.css`. To add a new theme:

1. Define CSS variables under a `.theme-yourtheme` class
2. Add theme metadata to `src/lib/themes.ts`
3. Theme will automatically appear in the selector

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + CSS Variables
- **UI Components:** shadcn/ui
- **Forms:** React Hook Form
- **Data Fetching:** TanStack Query v5
- **Task Management:** TaskWarrior 3.4.2
- **Icons:** Lucide React

## 📝 Development Features

- **TanStack Query DevTools** - Available in development mode
- **Single Query Architecture** - Optimized for client-side filtering
- **Skeleton Loading States** - Smooth loading experience
- **Theme Persistence** - No flicker on page load
- **Type Safety** - Full TypeScript coverage

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see below for details:

```
MIT License

Copyright (c) 2025 TaskWarlock Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 🙏 Acknowledgments

- [TaskWarrior](https://taskwarrior.org/) - The powerful CLI task management tool
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful, accessible component library
- Theme inspirations:
  - [Catppuccin](https://github.com/catppuccin/catppuccin)
  - [Kanagawa](https://github.com/rebelot/kanagawa.nvim)
  - [Rose Pine](https://rosepinetheme.com/)
  - [Everforest](https://github.com/sainnhe/everforest)
  - [Nord](https://www.nordtheme.com/)

## 📮 Support

If you encounter any issues or have questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review the TaskWarrior documentation

---

Built with ❤️ using Next.js and TaskWarrior

