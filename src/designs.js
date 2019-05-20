
export const bare = {
  screens: {
    1: {
      id: 1,
      components: {
        1: { id: 1, type: 'Grommet', props: { style: { height: '100vh' } } },
      },
    },
  },
};

export const rich = {
  screens: {
    1: {
      id: 1,
      components: {
        1: { id: 1, type: 'Grommet', props: { style: { height: '100vh'} }, children: [2] },
        2: { id: 2, type: 'Box', props: { align: 'center', justify: 'center', pad: 'small', fill: 'vertical', background: 'brand'}, children: [3,6,4] },
        3: { id: 3, type: 'Heading', props: { size: 'large', margin: 'none' }, text: 'Designer' },
        4: { id: 4, type: 'Box', props: { align: 'center', justify: 'between', pad: 'small', direction: 'row', alignSelf: 'stretch'}, children: [7,9] },
        5: { id: 5, type: 'Icon', props: { icon: 'LinkPrevious'} },
        6: { id: 6, type: 'Paragraph', props:{ size: 'xlarge' }, text: 'Design using real grommet components!'},
        7: { id: 7, type: 'Box', props: { align: 'center', justify: 'center', pad: 'small', direction: 'row', gap: 'small' }, children: [5,8] },
        8: { id: 8, type: 'Text', props: {}, text: 'add components' },
        9: { id: 9, type: 'Box', props: { align: 'center', justify: 'center', pad: 'small', direction: 'row', gap: 'small' }, children: [10,11] },
        10: { id: 10, type: 'Text', props: {}, text: 'describe components' },
        11: { id: 11, type: 'Icon', props: { icon: 'LinkNext'} },
      },
    },
  },
};

export const resetState = (starter = bare) => {
  let nextId = 1;
  Object.keys(starter.screens)
    .forEach(screenId => Object.keys(starter.screens[screenId].components)
      .forEach(id => (nextId = Math.max(nextId, parseInt(id, 10)))));
  nextId += 1;
  return {
    design: { ...starter, nextId, version: 1.0 },
    selected: { screen: 1, component: 1 },
  };
};

const resetId = (nextDesign, components, id) => {
  const component = components[id];
  const nextId = nextDesign.nextId;
  nextDesign.nextId += 1;
  components[nextId] = component;
  component.id = nextId;
  delete components[id];
  // update children references
  Object.keys(components).forEach(k => {
    const component = components[k];
    if (component.children) {
      const index = component.children.indexOf(id);
      if (index !== -1) {
        component.children.splice(index, 1, nextId);
      }
    }
  })
};

export const addScreen = (nextDesign) => {
  const screenId = nextDesign.nextId;
  nextDesign.nextId += 1;
  const screen = JSON.parse(JSON.stringify(bare.screens[1]));
  screen.id = screenId;
  nextDesign.screens[screenId] = screen;
  Object.keys(screen.components)
    .forEach(k => resetId(nextDesign, screen.components, parseInt(k, 10)));
  return screenId;
};

export const getComponent = (design, { screen, component }) =>
  design.screens[screen].components[component];

export const defaultComponent = (design, screen) =>
  parseInt(Object.keys(design.screens[screen].components)[0], 10);

export const getParent = (design, ids) => {
  const screen = design.screens[ids.screen];
  let result;
  Object.keys(screen.components).some(k => {
    const children = screen.components[k].children;
    if (children && children.includes(ids.component)) {
      result = screen.components[k];
      return true;
    }
    return false;
  });
  return result;
};

const componentToJSX = (id, screen, imports, iconImports, indent = '  ') => {
  const component = screen.components[id];
  if (component.type === 'Icon') {
    const { icon, ...rest } = component.props;
    iconImports[icon] = true;
    return `${indent}<${icon} ${Object.keys(rest).map(k => `${k}="${rest[k]}"`).join(' ')} />`;
  }
  if (component.type === 'Repeater') {
    const childId = component.children && component.children[0];
    return childId
      ? componentToJSX(childId, screen, imports, iconImports, indent)
      : '';
  }
  imports[component.type] = true;
  const children = component.children && component.children.map(cId =>
    componentToJSX(cId, screen, imports, iconImports, indent + '  ')).join("\n");
  return `${indent}<${component.type} ${Object.keys(component.props).map(name => {
    const value = component.props[name];
    if (typeof value === 'string') {
      return `${name}="${value}"`
    }
    return `${name}={${JSON.stringify(value)}}`;
  }).join(' ')}${children ? '' :  ' /'}>${children ? `\n${children}\n${indent}</${component.type}>` : ''}`;
}

export const generateJSX = (design) => {
  const grommetImports = {};
  const grommetIconImports = {};

  const screens = Object.keys(design.screens)
    .map(sKey => design.screens[sKey])
    .map(screen => `const ${screen.name || `Screen${screen.id}`} = () => (
${componentToJSX(1, screen, grommetImports, grommetIconImports)}
)`)
    .join("\n");

  return `import Rect from 'react'
import { ${Object.keys(grommetImports).join(', ')} } from 'grommet'
${Object.keys(grommetIconImports.length > 0)
  ? `import { ${Object.keys(grommetIconImports).join(', ')} } from 'grommet-icons'\n`
  : ''}
${screens}
`
};
