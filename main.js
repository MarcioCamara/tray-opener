const { resolve, basename } = require('path');
const { app, Menu, Tray, dialog } = require('electron');

const { spawn } = require('child_process');
const fixPath = require('fix-path');
const fs = require('fs');

const Store = require('electron-store');
const Sentry = require('@sentry/electron');

const pjson = require('./package.json');

fixPath();

Sentry.init({ dsn: 'https://1f3f5615881f4744821df4bcefa88129@sentry.io/3759329' });

const schema = {
  projects: {
    type: 'string',
  },
};

let mainTray = {};

if (app.dock) {
  app.dock.hide();
}

const store = new Store({ schema });

function getLocale() {
  const locale = app.getLocale();

  switch (locale) {
    case 'es-419' || 'es':
      return JSON.parse(fs.readFileSync(resolve(__dirname, 'locale/es.json')));
    case 'pt-BR' || 'pt-PT':
      return JSON.parse(fs.readFileSync(resolve(__dirname, 'locale/pt.json')));
    default:
      return JSON.parse(fs.readFileSync(resolve(__dirname, 'locale/en.json')));
  }
}

function render(tray = mainTray) {
  const storedProjects = store.get('projects');
  const projects = storedProjects ? JSON.parse(storedProjects) : [];
  const locale = getLocale();

  const items = projects.map(({ name, path }) => ({
    label: name,
    submenu: [
      {
        label: locale.open,
        click: () => {
          spawn('code', [path], { shell: true });
        },
      },
      {
        label: locale.remove,
        click: () => {
          const confirm = dialog.showMessageBoxSync({
            type: 'question',
            buttons: [
              locale.no,
              locale.yes,
            ],
            title: locale.removeTitle,
            message: locale.removeMessage,
          });

          if (confirm === 1) {
            store.set('projects', JSON.stringify(projects.filter(item => item.path !== path)));
            render();
          }
        },
      },
    ],
  }));

  const contextMenu = Menu.buildFromTemplate([
    {
      label: locale.add,
      click: () => {
        const result = dialog.showOpenDialogSync({ properties: ['openDirectory'] });

        if (!result) return;
        console.log(result);

        const [path] = result;
        const name = basename(path);

        store.set(
          'projects',
          JSON.stringify([
            ...projects,
            {
              path,
              name,
            },
          ]),
        );

        render();
      },
    },
    {
      type: 'separator',
    },
    ...items,
    {
      type: 'separator',
    },
    {
      label: locale.about,
      submenu: [
        {
          label: `${locale.developed} MCX Sistemas`,
          icon: resolve(__dirname, 'assets', 'logoMenu.png'),
          enabled: false,
        },
        {
          label: `${locale.version} ${pjson.version}`,
          enabled: false,
        },
      ],
    },
    {
      type: 'separator'
    },
    {
      type: 'normal',
      label: locale.close,
      role: 'quit',
      enabled: true,
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', tray.popUpContextMenu);
}

app.on('ready', () => {
  mainTray = new Tray(resolve(__dirname, 'assets', 'iconTemplate.png'));

  render(mainTray);
});
