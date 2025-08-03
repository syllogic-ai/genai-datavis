========================
CODE SNIPPETS
========================
TITLE: Basic Draggable Component Implementation - JavaScript
DESCRIPTION: Basic example showing how to implement a Draggable component with required props and render props pattern.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/api/draggable.md#2025-04-21_snippet_0

LANGUAGE: javascript
CODE:
```
import { Draggable } from '@hello-pangea/dnd';

<Draggable draggableId="draggable-1" index={0}>
  {(provided, snapshot) => (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
    >
      <h4>My draggable</h4>
    </div>
  )}
</Draggable>;
```

----------------------------------------

TITLE: Responder Types for Drag and Drop Events in @hello-pangea/dnd
DESCRIPTION: Defines the interfaces and types for responder functions that handle drag and drop events. Includes the main Responders interface along with various event-specific responder types, location data structures, and movement modes.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/types.md#2025-04-21_snippet_1

LANGUAGE: typescript
CODE:
```
interface Responders {
  // optional
  onBeforeCapture?: OnBeforeCaptureResponder;
  onBeforeDragStart?: OnBeforeDragStartResponder;
  onDragStart?: OnDragStartResponder;
  onDragUpdate?: OnDragUpdateResponder;

  // required
  onDragEnd: OnDragEndResponder;
}

type OnBeforeCaptureResponder = (before: BeforeCapture) => unknown;

type OnBeforeDragStartResponder = (start: DragStart) => unknown;

type OnDragStartResponder = (
  start: DragStart,
  provided: ResponderProvided,
) => unknown;

type OnDragUpdateResponder = (
  update: DragUpdate,
  provided: ResponderProvided,
) => unknown;

type OnDragEndResponder = (
  result: DropResult,
  provided: ResponderProvided,
) => unknown;

interface DraggableRubric {
  draggableId: DraggableId;
  type: TypeId;
  source: DraggableLocation;
}

interface DragStart extends DraggableRubric {
  mode: MovementMode;
}

interface DragUpdate extends DragStart {
  // populated if in a reorder position
  destination: DraggableLocation | null;
  // populated if combining with another draggable
  combine: Combine | null;
}

// details about the draggable that is being combined with
interface Combine {
  draggableId: DraggableId;
  droppableId: DroppableId;
}

interface DropResult extends DragUpdate {
  reason: DropReason;
}

type DropReason = 'DROP' | 'CANCEL';

interface DraggableLocation {
  droppableId: DroppableId;
  // the position of the droppable within a droppable
  index: number;
}

// There are two modes that a drag can be in
// FLUID: everything is done in response to highly granular input (eg mouse)
// SNAP: items snap between positions (eg keyboard);
type MovementMode = 'FLUID' | 'SNAP';
```

----------------------------------------

TITLE: Importing and Using Droppable Component in React
DESCRIPTION: This snippet demonstrates how to import and use the Droppable component from @hello-pangea/dnd. It shows the basic structure and usage of the component, including the required props and children function.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/api/droppable.md#2025-04-21_snippet_0

LANGUAGE: javascript
CODE:
```
import { Droppable } from '@hello-pangea/dnd';

<Droppable droppableId="droppable-1" type="PERSON">
  {(provided, snapshot) => (
    <div
      ref={provided.innerRef}
      style={{ backgroundColor: snapshot.isDraggingOver ? 'blue' : 'grey' }}
      {...provided.droppableProps}
    >
      <h2>I am a droppable!</h2>
      {provided.placeholder}
    </div>
  )}
</Droppable>;
```

----------------------------------------

TITLE: DragDropContext Implementation with Function Component
DESCRIPTION: Example implementation of DragDropContext using a React function component with hooks, demonstrating the use of useCallback for event handlers and showing how to set up both required and optional responders.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/api/drag-drop-context.md#2025-04-21_snippet_2

LANGUAGE: javascript
CODE:
```
import React from 'react';
import { DragDropContext } from '@hello-pangea/dnd';

function App() {
  // using useCallback is optional
  const onBeforeCapture = useCallback(() => {
    /*...*/
  }, []);
  const onBeforeDragStart = useCallback(() => {
    /*...*/
  }, []);
  const onDragStart = useCallback(() => {
    /*...*/
  }, []);
  const onDragUpdate = useCallback(() => {
    /*...*/
  }, []);
  const onDragEnd = useCallback(() => {
    // the only one that is required
  }, []);

  return (
    <DragDropContext
      onBeforeCapture={onBeforeCapture}
      onBeforeDragStart={onBeforeDragStart}
      onDragStart={onDragStart}
      onDragUpdate={onDragUpdate}
      onDragEnd={onDragEnd}
    >
      <div>Hello world</div>
    </DragDropContext>
  );
}
```

----------------------------------------

TITLE: Defining OnDragEnd Responder and DropResult Interface
DESCRIPTION: Type definitions for the required onDragEnd responder and its DropResult interface. This responder must be implemented to handle the final state after a drag operation completes, including synchronous reordering.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/responders.md#2025-04-21_snippet_5

LANGUAGE: typescript
CODE:
```
type OragEndResponder = (
  result: DropResult,
  provided: ResponderProvided,
) => unknown;

interface DropResult extends DragUpdate {
  reason: DropReason;
}

type DropReason = 'DROP' | 'CANCEL';
```

----------------------------------------

TITLE: TypeScript Interface Definitions for DragDropContext Component
DESCRIPTION: TypeScript interfaces defining the props and responders for the DragDropContext component, including event handlers, children requirements, and configuration options for accessibility and security features.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/api/drag-drop-context.md#2025-04-21_snippet_0

LANGUAGE: typescript
CODE:
```
interface Responders {
  // optional
  onBeforeCapture?: OnBeforeCaptureResponder;
  onBeforeDragStart?: OnBeforeDragStartResponder;
  onDragStart?: OnDragStartResponder;
  onDragUpdate?: OnDragUpdateResponder;

  // required
  onDragEnd: OnDragEndResponder;
}

import type { ReactNode } from 'react';
import { PartialAutoScrollConfig } from '../../state/auto-scroller/fluid-scroller/config/autoscroll-config-types';

interface Props extends Responders {
  // We do not technically need any children for this component
  children: ReactNode | null;
  // Read out by screen readers when focusing on a drag handle
  dragHandleUsageInstructions?: string;
  // Used for strict content security policies
  nonce?: string;
  // Used for custom sensors
  sensors?: Sensor[];
  enableDefaultSensors?: boolean | null;
  // autoScrollConfig options
  autoScrollerOptions?: PartialAutoScrollerOptions;
}
```

----------------------------------------

TITLE: DragDropContext Implementation with Class Component
DESCRIPTION: Example implementation of DragDropContext using a React class component, showing how to set up the required onDragEnd handler and optional event handlers like onBeforeCapture, onBeforeDragStart, onDragStart, and onDragUpdate.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/api/drag-drop-context.md#2025-04-21_snippet_1

LANGUAGE: javascript
CODE:
```
import React from 'react';
import { DragDropContext } from '@hello-pangea/dnd';

class App extends React.Component {
  onBeforeCapture = () => {
    /*...*/
  };

  onBeforeDragStart = () => {
    /*...*/
  };

  onDragStart = () => {
    /*...*/
  };
  onDragUpdate = () => {
    /*...*/
  };
  onDragEnd = () => {
    // the only one that is required
  };

  render() {
    return (
      <DragDropContext
        onBeforeCapture={this.onBeforeCapture}
        onBeforeDragStart={this.onBeforeDragStart}
        onDragStart={this.onDragStart}
        onDragUpdate={this.onDragUpdate}
        onDragEnd={this.onDragEnd}
      >
        <div>Hello world</div>
      </DragDropContext>
    );
  }
}
```

----------------------------------------

TITLE: Draggable Component Types in @hello-pangea/dnd
DESCRIPTION: Defines the types for the Draggable component, including provided props, state snapshots, styling interfaces, and drag handle properties. These types control the appearance and behavior of draggable elements during the drag operation.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/types.md#2025-04-21_snippet_4

LANGUAGE: typescript
CODE:
```
interface DraggableProvided {
  draggableProps: DraggableProps;
  dragHandleProps: DragHandleProps | null;
  innerRef: (a?: HTMLElement | null) => void;
}

interface DraggableStateSnapshot {
  isDragging: boolean;
  isDropAnimating: boolean;
  isClone: boolean;
  dropAnimation: DropAnimation | null;
  draggingOver: DroppableId | null;
  combineWith: DraggableId | null;
  combineTargetFor: DraggableId | null;
  mode: MovementMode | null;
}

interface DraggableProps {
  style?: DraggableStyle;
  'data-rfd-draggable-context-id': ContextId;
  'data-rfd-draggable-id': DraggableId;
  onTransitionEnd?: TransitionEventHandler;
}

type DraggableChildrenFn = (
  DraggableProvided,
  DraggableStateSnapshot,
  DraggableRubric,
) => ReactNode | null;

type DraggableStyle = DraggingStyle | NotDraggingStyle;
interface DraggingStyle {
  position: 'fixed';
  top: number;
  left: number;
  boxSizing: 'border-box';
  width: number;
  height: number;
  transition: string;
  transform?: string;
  zIndex: number;
  opacity?: number;
  pointerEvents: 'none';
}
interface NotDraggingStyle {
  transform?: string;
  transition?: 'none';
}

interface DragHandleProps {
  'data-rfd-drag-handle-draggable-id': DraggableId;
  'data-rfd-drag-handle-context-id': ContextId;
  role: string;
  'aria-describedby': ElementId;
  tabIndex: number;
  draggable: boolean;
  onDragStart: DragEventHandler;
}

interface DropAnimation {
  duration: number;
  curve: string;
  moveTo: Position;
  opacity: number | null;
  scale: number | null;
}
```

----------------------------------------

TITLE: Sensor API Types for Custom Drag Detection in @hello-pangea/dnd
DESCRIPTION: Defines the types for creating custom drag sensors. Includes the Sensor type, SensorAPI interface for interacting with the drag and drop system, and TryGetLock functionality for initiating drag operations.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/types.md#2025-04-21_snippet_2

LANGUAGE: typescript
CODE:
```
type Sensor = (api: SensorAPI) => void;
interface SensorAPI {
  tryGetLock: TryGetLock;
  canGetLock: (id: DraggableId) => boolean;
  isLockClaimed: () => boolean;
  tryReleaseLock: () => void;
  findClosestDraggableId: (event: Event) => DraggableId | null;
  findOptionsForDraggable: (id: DraggableId) => DraggableOptions | null;
}
type TryGetLock = (
  draggableId: DraggableId,
  forceStop?: () => void,
  options?: TryGetLockOptions,
) => PreDragActions | null;
interface TryGetLockOptions {
  sourceEvent?: Event;
}
```

----------------------------------------

TITLE: Rendering a List of Draggables with Keys in React
DESCRIPTION: This snippet demonstrates how to properly render a list of Draggable components in React, emphasizing the importance of adding a key prop to each Draggable for proper reconciliation.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/common-setup-issues.md#2025-04-21_snippet_0

LANGUAGE: javascript
CODE:
```
return items.map((item, index) => (
  <Draggable
    // adding a key is important!
    key={item.id}
    draggableId={item.id}
    index={index}
  >
    {(provided, snapshot) => (
      <div
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
      >
        {item.content}
      </div>
    )}
  </Draggable>
));
```

----------------------------------------

TITLE: SensorAPI Interface Definition in TypeScript
DESCRIPTION: This snippet defines the SensorAPI interface, which provides methods for managing locks, finding draggable elements, and accessing draggable options. It's used as the main API for creating custom sensors.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/sensors/sensor-api.md#2025-04-21_snippet_2

LANGUAGE: typescript
CODE:
```
interface SensorAPI {
  tryGetLock: TryGetLock;
  canGetLock: (id: DraggableId) => boolean;
  isLockClaimed: () => boolean;
  tryReleaseLock: () => void;
  findClosestDraggableId: (event: Event) => DraggableId | null;
  findOptionsForDraggable: (id: DraggableId) => DraggableOptions | null;
}

interface DraggableOptions {
  canDragInteractiveElements: boolean;
  shouldRespectForcePress: boolean;
  isEnabled: boolean;
}
```

----------------------------------------

TITLE: Defining OnDragStart Responder and Supporting Types
DESCRIPTION: Type definitions for the onDragStart responder and its supporting interfaces. This includes DragStart, DraggableRubric, DraggableLocation, and various ID types used throughout the drag system.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/responders.md#2025-04-21_snippet_3

LANGUAGE: typescript
CODE:
```
// While the return type is `mixed`, the return value is not used.
type OnDragStartResponder = (
  start: DragStart,
  provided: ResponderProvided,
) => unknown;

// supporting types
interface DraggableRubric {
  draggableId: DraggableId;
  type: TypeId;
  source: DraggableLocation;
}

interface DragStart extends DraggableRubric {
  mode: MovementMode;
}

interface DraggableLocation {
  droppableId: DroppableId;
  // the position of the draggable within a droppable
  index: number;
}
type Id = string;
type DraggableId = Id;
type DroppableId = Id;
type TypeId = Id;

type MovementMode = 'FLUID' | 'SNAP';
```

----------------------------------------

TITLE: Optimizing Droppable Performance with Class Components in @hello-pangea/dnd (TypeScript)
DESCRIPTION: An implementation of performance optimization for Droppable components using class components. It prevents unnecessary re-renders of child components by using shouldComponentUpdate to check if the students list reference has changed.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/api/droppable.md#2025-04-21_snippet_5

LANGUAGE: typescript
CODE:
```
import React, { Component } from 'react';

class Student extends Component<{ student: Person }> {
  render() {
    // Renders out a draggable student
  }
}

class InnerList extends Component<{ students: Person[] }> {
  // do not re-render if the students list has not changed
  shouldComponentUpdate(nextProps: Props) {
    if (this.props.students === nextProps.students) {
      return false;
    }
    return true;
  }
  // You could also not do your own shouldComponentUpdate check and just
  // extend from React.PureComponent

  render() {
    return this.props.students.map((student: Person) => (
      <Student student={student} />
    ));
  }
}

class Students extends Component<{ students: Person[] }> {
  render() {
    return (
      <Droppable droppableId="list">
        {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
          <div
            ref={provided.innerRef}
            style={{
              backgroundColor: snapshot.isDragging ? 'green' : 'lightblue',
            }}
            {...provided.droppableProps}
          >
            <InnerList students={this.props.students} />
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    );
  }
}
```

----------------------------------------

TITLE: Implementing Multi-Drag Event Handling in TypeScript
DESCRIPTION: This code snippet demonstrates how to implement event handling for multi-drag functionality in a Task component. It includes methods for handling key presses, mouse clicks, and determining selection modes based on modifier keys.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/patterns/multi-drag.md#2025-04-21_snippet_0

LANGUAGE: typescript
CODE:
```
class Task extends Component<Props> {
  onKeyDown = (event: KeyboardEvent, snapshot: DraggableStateSnapshot) => {
    // already used
    if (event.defaultPrevented) {
      return;
    }

    if (snapshot.isDragging) {
      return;
    }

    if (event.keyCode !== keyCodes.enter) {
      return;
    }

    // we are using the event for selection
    event.preventDefault();

    this.performAction(event);
  };

  // Using onClick as it will be correctly
  // preventing if there was a drag
  onClick = (event: MouseEvent) => {
    if (event.defaultPrevented) {
      return;
    }

    if (event.button !== primaryButton) {
      return;
    }

    // marking the event as used
    event.preventDefault();

    this.performAction(event);
  };

  // Determines if the platform specific toggle selection in group key was used
  wasToggleInSelectionGroupKeyUsed = (event: MouseEvent | KeyboardEvent) => {
    const isUsingWindows = navigator.platform.indexOf('Win') >= 0;
    return isUsingWindows ? event.ctrlKey : event.metaKey;
  };

  // Determines if the multiSelect key was used
  wasMultiSelectKeyUsed = (event: MouseEvent | KeyboardEvent) => event.shiftKey;

  performAction = (event: MouseEvent | KeyboardEvent) => {
    const {
      task,
      toggleSelection,
      toggleSelectionInGroup,
      multiSelectTo,
    } = this.props;

    if (this.wasToggleInSelectionGroupKeyUsed(event)) {
      toggleSelectionInGroup(task.id);
      return;
    }

    if (this.wasMultiSelectKeyUsed(event)) {
      multiSelectTo(task.id);
      return;
    }

    toggleSelection(task.id);
  };

  render() {
    return (
      <Draggable draggableId={task.id} index={this.props.index}>
        {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
          <Container
            innerRef={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={this.onClick}
            onKeyDown={(event: KeyboardEvent) =>
              this.onKeyDown(event, snapshot)
            }
          >
            {task.content}
          </Container>
        )}
      </Draggable>
    );
  }
}
```

----------------------------------------

TITLE: Defining OnDragUpdate Responder and DragUpdate Interface
DESCRIPTION: Type definitions for the onDragUpdate responder and its DragUpdate interface. This responder is called when anything changes during an active drag operation, such as position or droppable target.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/responders.md#2025-04-21_snippet_4

LANGUAGE: typescript
CODE:
```
// The return value of `mixed` is not used
type OnDragUpdateResponder = (
  update: DragUpdate,
  provided: ResponderProvided,
) => unknown;

interface DragUpdate extends DragStart {
  // may not have any destination (drag to nowhere)
  destination: DraggableLocation | null;
  // populated when a draggable is dragging over another in combine mode
  combine: Combine | null;
}

interface Combine {
  draggableId: DraggableId;
  droppableId: DroppableId;
}
```

----------------------------------------

TITLE: Virtual List Row Component with React-Window Integration
DESCRIPTION: Implements a Row component for react-window that handles both regular items and placeholder space. This component conditionally renders Draggable elements based on item data.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/patterns/virtual-lists.md#2025-04-21_snippet_3

LANGUAGE: jsx
CODE:
```
// This example uses the `react-window` API

const Row = ({ data, index, style }: RowProps) => {
  const item = data[index];

   // We are rendering an extra item for the placeholder
  if (!item) {
    return null;
  }

  return (
    <Draggable draggableId={item.id} index={index} key={item.id}>
      {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
        {/*...*/}
      )}
    </Draggable>
  );
});
```

----------------------------------------

TITLE: Draggable Props Interface - TypeScript
DESCRIPTION: TypeScript interface definition for Draggable component props, including required and optional properties.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/api/draggable.md#2025-04-21_snippet_1

LANGUAGE: typescript
CODE:
```
interface Props {
  // required
  draggableId: DraggableId;
  index: number;
  children: ChildrenFn;
  // optional
  isDragDisabled?: boolean;
  disableInteractiveElementBlocking?: boolean;
  shouldRespectForcePress?: boolean;
}
```

----------------------------------------

TITLE: Blocking React State Updates During Drag Operations
DESCRIPTION: Example of how to prevent state updates during drag operations when using React component state tied to a REST endpoint with periodic polling. This demonstrates two approaches: stopping the server poll entirely or ignoring server response data during active drags.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/responders.md#2025-04-21_snippet_6

LANGUAGE: markdown
CODE:
```
- stop your server poll during a drag
- ignore any results from server calls during a drag (do not call `setState` in your component with the new data)
```

----------------------------------------

TITLE: DraggableProvided Interface - TypeScript
DESCRIPTION: TypeScript interface for the provided object passed to Draggable render props function.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/api/draggable.md#2025-04-21_snippet_3

LANGUAGE: typescript
CODE:
```
interface DraggableProvided {
  draggableProps: DraggableProps;
  // will be null if the draggable is disabled
  dragHandleProps: DragHandleProps | null;
  innerRef: (a?: HTMLElement | null) => void;
}
```

----------------------------------------

TITLE: DroppableStateSnapshot Interface for Droppable Component
DESCRIPTION: This TypeScript interface defines the DroppableStateSnapshot object, which provides information about the current drag state for the Droppable component. It includes properties for isDraggingOver, draggingOverWith, draggingFromThisWith, and isUsingPlaceholder.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/api/droppable.md#2025-04-21_snippet_3

LANGUAGE: typescript
CODE:
```
interface DroppableStateSnapshot {
  // Is the Droppable being dragged over?
  isDraggingOver: boolean;
  // What is the id of the draggable that is dragging over the Droppable?
  draggingOverWith: DraggableId | null;
  // What is the id of the draggable that is dragging from this list?
  // Useful for styling the home list when not being dragged over
  draggingFromThisWith: DraggableId | null;
  // Whether or not the placeholder is actively being used.
  // This is useful information when working with virtual lists
  // (See our virtual list pattern)
  isUsingPlaceholder: boolean;
}
```

----------------------------------------

TITLE: Correct Usage of innerRef with Custom Component
DESCRIPTION: This snippet demonstrates the correct way to use innerRef with a custom component in a Draggable context. It passes the innerRef prop to the custom component instead of using ref directly.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/using-inner-ref.md#2025-04-21_snippet_5

LANGUAGE: diff
CODE:
```
<Draggable draggableId="draggable-1" index={0}>
  {(provided, snapshot) => (
    <Person
-      ref={provided.innerRef}
+      innerRef={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
    >
      <h4>My draggable</h4>
    </Person>
  )}
</Draggable>
```

----------------------------------------

TITLE: Advanced Ref Handling in Custom Component
DESCRIPTION: This snippet shows an advanced approach to handling refs in a custom component. It allows the component to maintain its own reference to the DOM node while also providing it to @hello-pangea/dnd.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/using-inner-ref.md#2025-04-21_snippet_7

LANGUAGE: js
CODE:
```
class Person extends React.Component {
  setRef = (ref) => {
    // keep a reference to the dom ref as an instance property
    this.ref = ref;
    // give the dom ref to @hello-pangea/dnd
    this.props.innerRef(ref);
  };
  render() {
    const { provided, innerRef } = this.props;
    return (
      <div
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        ref={this.setRef}
      >
        I am a person, I think..
      </div>
    );
  }
}
```

----------------------------------------

TITLE: DraggableStateSnapshot Interface with Combine Properties in TypeScript
DESCRIPTION: TypeScript interface showing the additional properties added to DraggableStateSnapshot for supporting combine functionality, including combineWith and combineTargetFor.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/combining.md#2025-04-21_snippet_1

LANGUAGE: typescript
CODE:
```
interface DraggableStateSnapshot {
  isDragging: boolean;
  isDropAnimating: boolean;
  isClone: boolean;
  dropAnimation: DropAnimation | null;
  draggingOver: DroppableId | null;
+ combineWith: DraggableId | null;
+ combineTargetFor: DraggableId | null;
  mode: MovementMode | null;
}
```

----------------------------------------

TITLE: Handling Combine Results in onDragEnd Responder with TypeScript
DESCRIPTION: Example of implementing the onDragEnd responder to handle combine results, showing how to remove a dragged item when it's combined with another item.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/combining.md#2025-04-21_snippet_2

LANGUAGE: typescript
CODE:
```
function onDragEnd(result) {
  // combining item
  if (result.combine) {
    // super simple: just removing the dragging item
    const items: Quote[] = [...this.state.items];
    items.splice(result.source.index, 1);
    setState({ items });
    return;
  }
}
```

----------------------------------------

TITLE: Implementing a Simple Sensor in TypeScript
DESCRIPTION: This snippet demonstrates how to create a basic sensor function and use it in a React component with DragDropContext. The sensor attempts to get a lock, performs drag actions, and then drops the item.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/sensors/sensor-api.md#2025-04-21_snippet_0

LANGUAGE: typescript
CODE:
```
function mySimpleSensor(api: SensorAPI) {
  const preDrag: PreDragActions | null = api.tryGetLock('item-1');
  // Could not get lock
  if (!preDrag) {
    return;
  }

  const drag: SnapDragActions = preDrag.snapLift();

  drag.moveDown();
  drag.moveDown();
  drag.moveDown();

  drag.drop();
}

function App() {
  return (
    <DragDropContext sensors={[mySimpleSensor]}>{/*...*/}</DragDropContext>
  );
}
```

----------------------------------------

TITLE: Exposing DOM Ref from Custom Component
DESCRIPTION: This code shows how to correctly expose a DOM ref from a custom component using an innerRef prop. This approach allows the component to be used correctly with Draggable and Droppable components.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/using-inner-ref.md#2025-04-21_snippet_4

LANGUAGE: js
CODE:
```
class Person extends React.Component {
  render() {
    return (
      <div {...this.props} ref={this.props.innerRef}>
        I am a person, I think..
      </div>
    );
  }
}
```

----------------------------------------

TITLE: Implementing renderClone for Virtual Lists in @hello-pangea/dnd
DESCRIPTION: Uses the renderClone API to create a clone of the dragging item, which is necessary when the original item might be unmounted during drag operations in virtual lists.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/patterns/virtual-lists.md#2025-04-21_snippet_1

LANGUAGE: jsx
CODE:
```
<Droppable
  droppableId="droppable"
  mode="virtual"
  renderClone={(provided, snapshot, rubric) => (
    <div
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      ref={provided.innerRef}
    >
      Item id: {items[rubric.source.index].id}
    </div>
  )}
>
  {/*...*/}
</Droppable>
```

----------------------------------------

TITLE: Defining DragActions and StopDragOptions Interfaces in TypeScript
DESCRIPTION: This snippet defines the DragActions interface, which includes methods for dropping, cancelling, and checking the status of a drag operation. It also defines the StopDragOptions interface for configuring drag stop behavior.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/sensors/sensor-api.md#2025-04-21_snippet_5

LANGUAGE: typescript
CODE:
```
interface DragActions {
  drop: (args?: StopDragOptions) => void;
  cancel: (args?: StopDragOptions) => void;
  isActive: () => boolean;
  shouldRespectForcePress: () => boolean;
}

interface StopDragOptions {
  shouldBlockNextClick: boolean;
}
```

----------------------------------------

TITLE: Defining ID Types in TypeScript for DnD Components
DESCRIPTION: TypeScript type definitions for Draggable and Droppable component identifiers. Establishes string-based ID types for maintaining consistency and type safety across the library.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/identifiers.md#2025-04-21_snippet_0

LANGUAGE: typescript
CODE:
```
type Id = string;
type DroppableId = Id;
type DraggableId = Id;
```

----------------------------------------

TITLE: Implementing Drag End Announcement in React
DESCRIPTION: Shows how to use the onDragEnd responder to provide custom announcements when a drag operation ends, including handling cancellation.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/screen-reader.md#2025-04-21_snippet_8

LANGUAGE: typescript
CODE:
```
onDragEnd = (result: DropResult, provided: ResponderProvided) => {
  if (result.reason === 'CANCEL') {
    provided.announce('Your cancel message');
    return;
  }
};
```

----------------------------------------

TITLE: Defining OnBeforeDragStart Responder Type in TypeScript
DESCRIPTION: Type definition for the onBeforeDragStart responder, which is called after dimensions are collected but before the drag officially starts. This is useful for dimension locking in table reordering.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/responders.md#2025-04-21_snippet_1

LANGUAGE: typescript
CODE:
```
// No second 'provided' argument
type OnBeforeDragStartResponder = (start: DragStart) => unknown;

// Otherwise the same type information as OnDragStartResponder
```

----------------------------------------

TITLE: Extending DraggableProps Style in React
DESCRIPTION: Example showing how to extend DraggableProps.style with custom inline styles while maintaining drag functionality. Shows proper handling of style merging with isDragging state.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/api/draggable.md#2025-04-21_snippet_5

LANGUAGE: javascript
CODE:
```
<Draggable draggable="draggable-1" index={0}>
  {(provided, snapshot) => {
    // extending the DraggableStyle with our own inline styles
    const style = {
      backgroundColor: snapshot.isDragging ? 'blue' : 'white',
      fontSize: 18,
      ...provided.draggableProps.style,
    };
    return (
      <div ref={provided.innerRef} {...provided.draggableProps} style={style}>
        Drag me!
      </div>
    );
  }}
</Draggable>
```

----------------------------------------

TITLE: Optimizing Droppable Performance with Function Components in @hello-pangea/dnd (TypeScript)
DESCRIPTION: An implementation of performance optimization for Droppable components using function components and React.memo. It prevents unnecessary re-renders by memoizing the InnerList component based on the students array reference.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/api/droppable.md#2025-04-21_snippet_6

LANGUAGE: typescript
CODE:
```
import React from 'react';

function Student (props: { student: Person }) {
  // Renders out a draggable student
}

// do not re-render if the students list reference has not changed
const InnerList = React.memo(function InnerList(props: students: Person[]) {
  return props.students.map((student: Person) => (
    <Student student={student} />
  ));
});

function Students(props: { students: Person[] }) {
  return (
    <Droppable droppableId="list">
      {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
        <div
          ref={provided.innerRef}
          style={{
            backgroundColor: snapshot.isDragging ? 'green' : 'lightblue',
          }}
          {...provided.droppableProps}
        >
          {/* only re-render if the students array reference changes */}
          <InnerList students={props.students} />
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}
```

----------------------------------------

TITLE: Patching Drop Animation Style in React Component
DESCRIPTION: Demonstrates how to modify the drop animation by patching the style object. This example adds a rotation effect and extends the duration of the drop animation. The code includes a getStyle function and a TaskItem component implementation.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/drop-animation.md#2025-04-21_snippet_1

LANGUAGE: javascript
CODE:
```
function getStyle(style, snapshot) {
  if (!snapshot.isDropAnimating) {
    return style;
  }
  const { moveTo, curve, duration } = snapshot.dropAnimation;
  // move to the right spot
  const translate = `translate(${moveTo.x}px, ${moveTo.y}px)`;
  // add a bit of turn for fun
  const rotate = 'rotate(0.5turn)';

  // patching the existing style
  return {
    ...style,
    transform: `${translate} ${rotate}`,
    // slowing down the drop because we can
    transition: `all ${curve} ${duration + 1}s`,
  };
}

function TaskItem(props) {
  const { task, index } = props;
  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          isDragging={snapshot.isDragging && !snapshot.isDropAnimating}
          style={getStyle(provided.draggableProps.style, snapshot)}
        >
          {task.content}
        </div>
      )}
    </Draggable>
  );
}
```

----------------------------------------

TITLE: Sample onDragStart Callback Structure in Hello Pangea DnD
DESCRIPTION: This snippet shows the data structure received in the onDragStart callback when a drag operation begins in Hello Pangea DnD. It includes the draggableId, type, and source information.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/changes-while-dragging.md#2025-04-21_snippet_0

LANGUAGE: javascript
CODE:
```
{
  draggableId: 'item-1',,
  type: 'TYPE',
  source: {
    droppableId: 'droppable',
    index: 1,
  },
}
```

----------------------------------------

TITLE: Defining AutoScrollerOptions Interface in TypeScript
DESCRIPTION: This code snippet defines the interface for customizing auto scroll behavior in the DragDropContext component. It includes options for scroll initiation distance, maximum scroll speed, easing function, duration dampening, and the ability to disable auto scroll.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/auto-scrolling.md#2025-04-21_snippet_0

LANGUAGE: typescript
CODE:
```
const autoScrollerOptions: PartialAutoScrollerOptions = {
  // percentage distance from edge of container at which to start auto scrolling
  startFromPercentage?: number;
  // percentage distance from edge of container at which max scroll speed is achieved
  maxScrollAtPercentage?: number;
  // pixels per frame
  maxPixelScroll?: number;
  // A function used to ease a percentage value for scroll
  ease?: (percentage: number) => number;
  durationDampening?: {
    // ms: how long to dampen the speed of an auto scroll from the start of a drag
    stopDampeningAt?: number;
    // ms: when to start accelerating the reduction of duration dampening
    accelerateAt?: number;
  };
  // whether or not autoscroll should be turned off entirely
  disabled?: boolean;
}
```

----------------------------------------

TITLE: Implementing Cloning API for Draggable Components in React
DESCRIPTION: This snippet demonstrates how to use the cloning API to reparent a <Draggable /> component during drag operations. It shows the implementation of a List component using <Droppable /> and <Draggable /> with the renderClone prop.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/reparenting.md#2025-04-21_snippet_0

LANGUAGE: javascript
CODE:
```
function List(props) {
  const items = props.items;

  return (
    <Droppable
      droppableId="droppable"
      renderClone={(provided, snapshot, rubric) => (
        <div
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          ref={provided.innerRef}
        >
          Item id: {items[rubric.source.index].id}
        </div>
      )}
    >
      {(provided) => (
        <div ref={provided.innerRef} {...provided.droppableProps}>
          {items.map((item) => (
            <Draggable draggableId={item.id} index={item.index}>
              {(provided, snapshot) => (
                <div
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                  ref={provided.innerRef}
                >
                  Item id: {item.id}
                </div>
              )}
            </Draggable>
          ))}
        </div>
      )}
    </Droppable>
  );
}
```

----------------------------------------

TITLE: Droppable Component Types in @hello-pangea/dnd
DESCRIPTION: Defines the types for the Droppable component, including props provided to the component, properties for the drop target, and state snapshots that track the current drag state relative to this droppable.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/types.md#2025-04-21_snippet_3

LANGUAGE: typescript
CODE:
```
interface DroppableProvided {
  innerRef: (a?: HTMLElement | null) => void;
  placeholder: ReactNode | null;
  droppableProps: DroppableProps;
}
interface DroppableProps {
  // used for shared global styles
  'data-rfd-droppable-context-id': ContextId;
  // Used to lookup. Currently not used for drag and drop lifecycle
  'data-rfd-droppable-id': DroppableId;
}
interface DroppableStateSnapshot {
  isDraggingOver: boolean;
  draggingOverWith: DraggableId | null;
  draggingFromThisWith: DraggableId | null;
  isUsingPlaceholder: boolean;
}
```

----------------------------------------

TITLE: Adding innerRef to Draggable Component in JSX
DESCRIPTION: This snippet demonstrates how to correctly add the innerRef to a Draggable component. It uses the provided.innerRef function to set the ref on the draggable element.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/using-inner-ref.md#2025-04-21_snippet_0

LANGUAGE: diff
CODE:
```
<Draggable draggableId="draggable-1" index={0}>
  {(provided, snapshot) => (
    <div
+      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
    >
      <h4>My draggable</h4>
    </div>
  )}
</Draggable>;
```

----------------------------------------

TITLE: Creating a Custom Sensor with React Hooks in TypeScript
DESCRIPTION: This example shows how to create a more complex sensor using React hooks. It sets up an event listener for clicks, attempts to get a lock, and performs drag actions when triggered.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/sensors/sensor-api.md#2025-04-21_snippet_1

LANGUAGE: typescript
CODE:
```
function useMyCoolSensor(api: SensorAPI) {
  const start = useCallback(function start(event: MouseEvent) {
    const preDrag: PreDragActions | null = api.tryGetLock('item-2');
    if (!preDrag) {
      return;
    }
    preDrag.snapLift();
    preDrag.moveDown();
    preDrag.drop();
  }, []);

  useEffect(() => {
    window.addEventListener('click', start);

    return () => {
      window.removeEventListener('click', start);
    };
  }, []);
}

function App() {
  return (
    <DragDropContext sensors={[useMyCoolSensor]}>
      <Things />
    </DragDropContext>
  );
}
```

----------------------------------------

TITLE: Adding innerRef to Droppable Component in JSX
DESCRIPTION: This snippet shows how to correctly add the innerRef to a Droppable component. It uses the provided.innerRef function to set the ref on the droppable element.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/using-inner-ref.md#2025-04-21_snippet_1

LANGUAGE: diff
CODE:
```
<Droppable droppableId="droppable-1">
  {(provided, snapshot) => (
    <div
+     ref={provided.innerRef}
      {...provided.droppableProps}
    >
      <h2>I am a droppable!</h2>
      {provided.placeholder}
    </div>
  )}
</Droppable>;
```

----------------------------------------

TITLE: Mapping Items to Draggables - JavaScript
DESCRIPTION: Example showing how to map an array of items to Draggable components with proper indexing.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/api/draggable.md#2025-04-21_snippet_2

LANGUAGE: javascript
CODE:
```
{
  this.props.items.map((item, index) => (
    <Draggable draggableId={item.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
        >
          {item.content}
        </div>
      )}
    </Draggable>
  ));
}
```

----------------------------------------

TITLE: Implementing Vibration Feedback for Touch Drag in React
DESCRIPTION: Example React component demonstrating how to add vibration feedback when starting a drag operation using the browser's Vibration API. This provides tactile feedback on supported devices (primarily Chrome on Android) when a user initiates a drag.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/sensors/touch.md#2025-04-21_snippet_0

LANGUAGE: javascript
CODE:
```
class App extends React.Component {
  onDragStart = () => {
    // good times
    if (window.navigator.vibrate) {
      window.navigator.vibrate(100);
    }
  };
  /*...*/
}
```

----------------------------------------

TITLE: Reusing Draggable Children Function with Cloning API in React
DESCRIPTION: This snippet shows how to reuse the <Draggable /> children function when implementing the cloning API. It defines a getRenderItem function that returns a render function for both the clone and the original draggable items.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/reparenting.md#2025-04-21_snippet_1

LANGUAGE: javascript
CODE:
```
const getRenderItem = (items) => (provided, snapshot, rubric) => (
  <div
    {...provided.draggableProps}
    {...provided.dragHandleProps}
    ref={provided.innerRef}
  >
    Item id: {items[rubric.source.index].id}
  </div>
);

function List(props) {
  const items = props.items;
  const renderItem = getRenderItem(items);

  return (
    <Droppable droppableId="droppable" renderClone={renderItem}>
      {(provided, snapshot) => (
        <div ref={provided.innerRef} {...provided.droppableProps}>
          {items.map((item) => (
            <Draggable draggableId={item.id} index={item.index}>
              {renderItem}
            </Draggable>
          ))}
        </div>
      )}
    </Droppable>
  );
}
```

----------------------------------------

TITLE: DraggableStateSnapshot Interface
DESCRIPTION: TypeScript interface defining the snapshot object provided to Draggable components for state management.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/api/draggable.md#2025-04-21_snippet_10

LANGUAGE: typescript
CODE:
```
interface DraggableStateSnapshot {
  isDragging: boolean;
  isDropAnimating: boolean;
  dropAnimation: DropAnimation | null;
  draggingOver: DroppableId | null;
  combineWith: DraggableId | null;
  combineTargetFor: DraggableId | null;
  mode: MovementMode | null;
}
```

----------------------------------------

TITLE: Implementing Drag Start Announcement in React
DESCRIPTION: Shows how to use the onDragStart responder to provide a custom announcement when a drag operation begins.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/screen-reader.md#2025-04-21_snippet_6

LANGUAGE: typescript
CODE:
```
onDragStart = (start: DragStart, provided: ResponderProvided) => {
  provided.announce('My super cool message');
};
```

----------------------------------------

TITLE: Implementing Drag Update Announcement in React
DESCRIPTION: Demonstrates how to use the onDragUpdate responder to provide custom announcements during a drag operation.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/screen-reader.md#2025-04-21_snippet_7

LANGUAGE: typescript
CODE:
```
onDragUpdate = (update: DragUpdate, provided: ResponderProvided) => {
  provided.announce('Update message');
};
```

----------------------------------------

TITLE: Droppable Component Props Interface
DESCRIPTION: This TypeScript interface defines the props for the Droppable component. It includes both required and optional props, such as droppableId, children function, mode, type, and various flags for customizing behavior.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/api/droppable.md#2025-04-21_snippet_1

LANGUAGE: typescript
CODE:
```
import type { ReactNode } from 'react';

interface Props {
  // required
  droppableId: DroppableId;
  children: (DroppableProvided, DroppableStateSnapshot) => ReactNode;
  // optional
  mode?: DroppableMode;
  type?: TypeId;
  isDropDisabled?: boolean;
  isCombineEnabled?: boolean;
  direction?: Direction;
  renderClone?: DraggableChildrenFn | null;
  ignoreContainerClipping?: boolean;
  getContainerForClone?: () => HTMLElement;
}

type DroppableMode = 'standard' | 'virtual';
type Direction = 'horizontal' | 'vertical';
```

----------------------------------------

TITLE: DragHandle Props TypeScript Interface
DESCRIPTION: TypeScript interface definition for dragHandleProps, showing required properties for drag handle functionality.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/api/draggable.md#2025-04-21_snippet_7

LANGUAGE: typescript
CODE:
```
interface DragHandleProps {
  // what draggable the handle belongs to
  'data-rfd-drag-handle-draggable-id': DraggableId;

  // What DragDropContext the drag handle is in
  'data-rfd-drag-handle-context-id': ContextId;

  role: string;
  // Id of hidden element that contains the lift instruction (nicer screen reader text)
  'aria-labelledby': ElementId;

  // Allow tabbing to this element
  tabIndex: number;

  // Stop html5 drag and drop
  draggable: boolean;
  onDragStart: DragEventHandler;
}
```

----------------------------------------

TITLE: Setting Background Color Based on Droppable State in @hello-pangea/dnd (TypeScript)
DESCRIPTION: A function that determines the background color of a Droppable component based on its state snapshot. It returns 'pink' when dragging over, 'blue' when dragging from the list but not over it, and 'white' as the default background.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/api/droppable.md#2025-04-21_snippet_4

LANGUAGE: typescript
CODE:
```
const getBackgroundColor = (snapshot: DroppableStateSnapshot): string => {
  // Giving isDraggingOver preference
  if (snapshot.isDraggingOver) {
    return 'pink';
  }

  // If it is the home list but not dragging over
  if (snapshot.draggingFromThisWith) {
    return 'blue';
  }

  // Otherwise use our default background
  return 'white';
};
```

----------------------------------------

TITLE: TypeScript Definition for getContainerForClone in hello-pangea/dnd
DESCRIPTION: This snippet shows the TypeScript definition for the getContainerForClone function used in the cloning API. It specifies that the function should return an HTMLElement to be used as the container for the clone.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/reparenting.md#2025-04-21_snippet_3

LANGUAGE: javascript
CODE:
```
getContainerForClone: () => HTMLElement,
```

----------------------------------------

TITLE: Implementing Placeholder Space in Virtual Lists with React-Window
DESCRIPTION: Creates a custom placeholder solution for virtual lists by adding an extra item to the list when dragging. This addresses the limitation that standard placeholders don't work with virtual lists.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/patterns/virtual-lists.md#2025-04-21_snippet_4

LANGUAGE: jsx
CODE:
```
function render(provided: DroppableProvided, snapshot: DroppableStateSnapshot) {
  // Add an extra item to our list to make space for a dragging item
  // Usually the DroppableProvided.placeholder does this, but that won't
  // work in a virtual list
  const itemCount: number = snapshot.isUsingPlaceholder
    ? quotes.length + 1
    : quotes.length;

  return (
    <List
      height={500}
      itemCount={itemCount}
      itemSize={110}
      width={300}
      outerRef={provided.innerRef}
      itemData={quotes}
    >
      {Row}
    </List>
  );
}
```

----------------------------------------

TITLE: DroppableProvided Interface for Droppable Component
DESCRIPTION: This TypeScript interface defines the DroppableProvided object, which is passed to the children function of the Droppable component. It includes properties for innerRef, placeholder, and droppableProps.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/api/droppable.md#2025-04-21_snippet_2

LANGUAGE: typescript
CODE:
```
interface DroppableProvided {
  innerRef: (a?: HTMLElement | null) => void;
  placeholder: ReactNode | null;
  droppableProps: DroppableProps;
}

interface DroppableProps {
  // used for shared global styles
  'data-rfd-droppable-context-id': ContextId;
  // Used to lookup. Currently not used for drag and drop lifecycle
  'data-rfd-droppable-id': DroppableId;
}
```

----------------------------------------

TITLE: Standard DragHandle Implementation
DESCRIPTION: Basic implementation of dragHandleProps in a Draggable component.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/api/draggable.md#2025-04-21_snippet_8

LANGUAGE: javascript
CODE:
```
<Draggable draggableId="draggable-1" index={0}>
  {(provided, snapshot) => (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
    >
      Drag me!
    </div>
  )}
</Draggable>
```

----------------------------------------

TITLE: Enabling Combining on a Droppable in @hello-pangea/dnd with JavaScript
DESCRIPTION: Code snippet showing how to enable the combining feature by setting the isCombineEnabled prop to true on a Droppable component.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/combining.md#2025-04-21_snippet_0

LANGUAGE: javascript
CODE:
```
<Droppable droppableId="droppable" isCombineEnabled>
  ...
</Droppable>
```

----------------------------------------

TITLE: Basic ID Type Definitions in TypeScript for @hello-pangea/dnd
DESCRIPTION: Defines the basic ID types used throughout the drag and drop library. These include generic IDs, DraggableId, DroppableId, TypeId, ContextId, and ElementId, all of which are string-based types.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/types.md#2025-04-21_snippet_0

LANGUAGE: typescript
CODE:
```
type Id = string;
type DraggableId = Id;
type DroppableId = Id;
type TypeId = Id;
type ContextId = Id;
type ElementId = Id;
```

----------------------------------------

TITLE: Applying SVG as Background Image in CSS
DESCRIPTION: This CSS snippet shows how to apply an SVG as a background image to an HTML element. This approach can be used in conjunction with @hello-pangea/dnd to create draggable components with SVG backgrounds.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/dragging-svgs.md#2025-04-21_snippet_3

LANGUAGE: css
CODE:
```
.item {
  background-image: url(my-cool-image.svg);
}
```

----------------------------------------

TITLE: Disabling Pointer Events for Dragging Drag Handles in CSS
DESCRIPTION: Optimizes performance by disabling pointer events processing during dragging and allows scrolling through a drag handle with a track pad or mouse wheel.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/preset-styles.md#2025-04-21_snippet_5

LANGUAGE: css
CODE:
```
pointer-events: none;
```

----------------------------------------

TITLE: Importing @hello-pangea/dnd Library
DESCRIPTION: This code snippet demonstrates how to import the @hello-pangea/dnd library. It's a crucial step for using the library's drag and drop functionality with screen reader support.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/screen-reader.md#2025-04-21_snippet_0

LANGUAGE: markdown
CODE:
```
`@hello-pangea/dnd`
```

----------------------------------------

TITLE: Disabling Overflow Anchor for Droppables in CSS
DESCRIPTION: Opts out of the browser's automatic scroll position maintenance when DOM changes occur above the fold, allowing for correct scroll positioning after dropping.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/preset-styles.md#2025-04-21_snippet_3

LANGUAGE: css
CODE:
```
overflow-anchor: none;
```

----------------------------------------

TITLE: TryGetLock Function Type Definition in TypeScript
DESCRIPTION: This snippet defines the TryGetLock function type, which is used to attempt to acquire a lock for dragging. It includes parameters for the draggable ID, a force stop function, and optional lock options.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/sensors/sensor-api.md#2025-04-21_snippet_3

LANGUAGE: typescript
CODE:
```
type TryGetLock = (
  draggableId: DraggableId,
  forceStop?: () => void,
  options?: TryGetLockOptions,
) => PreDragActions | null;

interface TryGetLockOptions {
  sourceEvent?: Event;
}
```

----------------------------------------

TITLE: Setting Cursor and User Select for Body During Drag in CSS
DESCRIPTION: Applies a 'grabbing' cursor to the body during dragging for user feedback and prevents text selection. These styles can be overridden if desired.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/preset-styles.md#2025-04-21_snippet_9

LANGUAGE: css
CODE:
```
cursor: grabbing;
user-select: none;
```

----------------------------------------

TITLE: Setting Cursor Style for Resting Drag Handles in CSS
DESCRIPTION: Applies a 'grab' cursor style to drag handles when at rest, indicating to users that the element is draggable.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/preset-styles.md#2025-04-21_snippet_4

LANGUAGE: css
CODE:
```
cursor: grab;
```

----------------------------------------

TITLE: Modifying CSP to Allow Unsafe Inline Styles
DESCRIPTION: This diff shows how to modify the Content Security Policy to allow unsafe inline styles. It changes the 'style-src' directive from 'self' to 'unsafe-inline', which is a less secure but simpler solution.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/content-security-policy.md#2025-04-21_snippet_0

LANGUAGE: diff
CODE:
```
- Content-Security-Policy: style-src 'self'
+ Content-Security-Policy: style-src 'unsafe-inline'
```

----------------------------------------

TITLE: Wrapping SVG in HTMLElement for @hello-pangea/dnd (JavaScript)
DESCRIPTION: This code snippet shows the recommended way to use an SVG within a draggable component by wrapping it in an HTMLElement (span in this case). This approach ensures better accessibility and cross-browser compatibility.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/dragging-svgs.md#2025-04-21_snippet_1

LANGUAGE: javascript
CODE:
```
// ✅ supported
<Draggable draggableId="supported" index={0}>
{provided => (
  <span
    {...provided.draggableProps}
    {...provided.dragHandleProps}
    ref={provided.innerRef}
    >
      <svg {/* other SVG stuff */} />
  </span>
)}
</Draggable>
```

----------------------------------------

TITLE: Custom Drag Handle Implementation
DESCRIPTION: Example showing how to implement a custom drag handle within a Draggable component.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/api/draggable.md#2025-04-21_snippet_9

LANGUAGE: javascript
CODE:
```
<Draggable draggableId="draggable-1" index={0}>
  {(provided, snapshot) => (
    <div ref={provided.innerRef} {...provided.draggableProps}>
      <h2>Hello there</h2>
      <div {...provided.dragHandleProps}>Drag handle</div>
    </div>
  )}
</Draggable>
```

----------------------------------------

TITLE: HTML Section with Role Description
DESCRIPTION: Shows how to use aria-roledescription to provide more specific semantic meaning to sections

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/screen-reader.md#2025-04-21_snippet_2

LANGUAGE: html
CODE:
```
<section aria-roledescription="slide"> Quarterly Report</section>
```

----------------------------------------

TITLE: Using IMG Tag for SVG in @hello-pangea/dnd (JavaScript)
DESCRIPTION: This code snippet demonstrates how to use an SVG as a draggable component by utilizing an <img> tag with the SVG file as its source. This method provides an alternative way to incorporate SVGs while maintaining compatibility with @hello-pangea/dnd.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/dragging-svgs.md#2025-04-21_snippet_2

LANGUAGE: javascript
CODE:
```
// ✅ supported
<Draggable draggableId="supported" index={0}>
  {(provided) => (
    <img
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      ref={provided.innerRef}
      src="my-cool-image.svg"
    />
  )}
</Draggable>
```

----------------------------------------

TITLE: Disabling Development Warnings in @hello-pangea/dnd (JavaScript)
DESCRIPTION: Code snippet showing how to disable all development warnings from the @hello-pangea/dnd library by setting a specific flag on the window object. This only affects development builds and won't strip messages from production builds.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/setup-problem-detection-and-error-recovery.md#2025-04-21_snippet_0

LANGUAGE: javascript
CODE:
```
// disable all @hello-pangea/dnd development warnings
window['__@hello-pangea/dnd-disable-dev-warnings'] = true;
```

----------------------------------------

TITLE: Using HTMLElement with SVG Background in @hello-pangea/dnd (JavaScript)
DESCRIPTION: This code snippet demonstrates how to use an HTMLElement with an SVG background image as a draggable component in @hello-pangea/dnd. This method allows for the incorporation of SVGs while maintaining full compatibility with the library.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/dragging-svgs.md#2025-04-21_snippet_4

LANGUAGE: javascript
CODE:
```
// ✅ supported
<Draggable draggableId="supported" index={0}>
  {(provided) => (
    <div
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      ref={provided.innerRef}
      className="item"
    />
  )}
</Draggable>
```

----------------------------------------

TITLE: DropAnimation TypeScript Interface Definition
DESCRIPTION: Defines the structure of the DropAnimation object which provides information about the drop animation, including duration, curve, position, opacity, and scale. The interface also includes a DropReason type definition.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/drop-animation.md#2025-04-21_snippet_0

LANGUAGE: typescript
CODE:
```
type DropReason = 'DROP' | 'CANCEL';

interface DropAnimation {
  // how long the animation will run for
  duration: number;
  // the animation curve that we will be using for the drop
  curve: string;
  // the x,y position will be be animating to as a part of the drop
  moveTo: Position;
  // when combining with another item, we animate the opacity when dropping
  opacity: number | null;
  // when combining with another item, we animate the scale when dropping
  scale: number | null;
}
```

----------------------------------------

TITLE: Keyboard Key Representation in Documentation
DESCRIPTION: Shows how keyboard keys are represented in the documentation using the kbd HTML tag for visual display of arrow keys and spacebar.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/patterns/multi-drag.md#2025-04-21_snippet_1

LANGUAGE: html
CODE:
```
<kbd>↑</kbd> <kbd>↓</kbd> <kbd>→</kbd> <kbd>←</kbd>
```

LANGUAGE: html
CODE:
```
<kbd>space</kbd>
```

----------------------------------------

TITLE: Importing TypeScript Types from @hello-pangea/dnd
DESCRIPTION: Demonstrates how to import and use TypeScript types from the @hello-pangea/dnd package in your application code.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/types.md#2025-04-21_snippet_5

LANGUAGE: javascript
CODE:
```
import type { DroppableProvided } from '@hello-pangea/dnd';
```

----------------------------------------

TITLE: Configuring Droppable with Virtual Mode in @hello-pangea/dnd
DESCRIPTION: Sets the Droppable component's mode to 'virtual' to enable drag and drop functionality within virtual lists. This is a required configuration for working with virtualized lists.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/patterns/virtual-lists.md#2025-04-21_snippet_0

LANGUAGE: jsx
CODE:
```
<Droppable droppableId="droppable" mode="virtual">
  {/*...*/}
</Droppable>
```

----------------------------------------

TITLE: Implementing Nonce with DragDropContext in React
DESCRIPTION: This JavaScript snippet demonstrates how to use a nonce with the DragDropContext component from @hello-pangea/dnd. The nonce is obtained from a getNonce() function and passed as a prop to the DragDropContext component.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/content-security-policy.md#2025-04-21_snippet_1

LANGUAGE: javascript
CODE:
```
<DragDropContext nonce={getNonce()}>{/*...*/}</DragDropContext>
```

----------------------------------------

TITLE: Calculating Position from Index in JavaScript
DESCRIPTION: Demonstrates how to convert a zero-based index to a one-based position for more natural screen reader announcements.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/screen-reader.md#2025-04-21_snippet_5

LANGUAGE: javascript
CODE:
```
const position = (index) => index + 1;

const startPosition = position(source.index);
const endPosition = destination ? position(destination.index) : null;
```

----------------------------------------

TITLE: Inlining Images Using Base64 Encoding in HTML
DESCRIPTION: Demonstrates how to replace a standard image source reference with a base64-encoded string to prevent flickering. This approach embeds the image data directly in the HTML rather than requiring a separate HTTP request.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/avoiding-image-flickering.md#2025-04-21_snippet_0

LANGUAGE: diff
CODE:
```
- <img src="/public/my-image.png">

+ <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAA...">
```

----------------------------------------

TITLE: Handling Click Events with Drag and Drop in TypeScript
DESCRIPTION: This snippet demonstrates how to safely add a window click event handler that respects drag and drop interactions. It checks if the event has already been used for drag and drop before executing custom logic.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/how-we-use-dom-events.md#2025-04-21_snippet_0

LANGUAGE: typescript
CODE:
```
window.addEventListener('click', (event: MouseEvent) => {
  // event has already been used for drag and drop
  if (event.defaultPrevented) {
    return;
  }

  doMyCoolThing();
});
```

----------------------------------------

TITLE: Defining ResponderProvided Interface for Screen Reader Announcements
DESCRIPTION: Type definitions for the ResponderProvided object that is passed to drag responders. It contains the announce function for making screen reader announcements during drag operations.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/responders.md#2025-04-21_snippet_2

LANGUAGE: typescript
CODE:
```
interface ResponderProvided {
  announce: Announce;
}

type Announce = (message: string) => void;
```

----------------------------------------

TITLE: Setting Individual Overflow Axes in CSS
DESCRIPTION: This snippet shows how to set overflow properties for individual axes (x and y) in CSS. It's equivalent to the shorthand version shown in the previous snippet.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/how-we-detect-scroll-containers.md#2025-04-21_snippet_1

LANGUAGE: css
CODE:
```
overflow-x: $value
overflow-y: $value
```

----------------------------------------

TITLE: Demonstrating Fluid Drag Move Batching in TypeScript
DESCRIPTION: This snippet shows how multiple move calls in fluid dragging are batched into a single update using requestAnimationFrame.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/sensors/sensor-api.md#2025-04-21_snippet_7

LANGUAGE: typescript
CODE:
```
const drag: SnapDragActions = preDrag.fluidLift({ x: 0, y: 0 });

// will all be batched into a single update
drag.move({ x: 0, y: 1 });
drag.move({ x: 0, y: 2 });
drag.move({ x: 0, y: 3 });

// after animation frame
// update(x: 0, y: 3)
```

----------------------------------------

TITLE: Setting CSS Overflow Property
DESCRIPTION: This snippet demonstrates the shorthand for setting overflow properties in CSS. It shows that setting 'overflow' is equivalent to setting both 'overflow-x' and 'overflow-y' to the same value.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/how-we-detect-scroll-containers.md#2025-04-21_snippet_0

LANGUAGE: css
CODE:
```
overflow: $value
```

----------------------------------------

TITLE: Defining PreDragActions Interface in TypeScript
DESCRIPTION: This snippet defines the PreDragActions interface, which contains methods for managing the pre-drag state, including checking lock status, respecting force press, lifting items, and aborting the pre-drag.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/sensors/sensor-api.md#2025-04-21_snippet_4

LANGUAGE: typescript
CODE:
```
interface PreDragActions {
  // discover if the lock is still active
  isActive: () => boolean;
  // whether it has been indicated if force press should be respected
  shouldRespectForcePress: () => boolean;
  // Lift the current item
  fluidLift: (clientSelection: Position) => FluidDragActions;
  snapLift: () => SnapDragActions;
  // Cancel the pre drag without starting a drag. Releases the lock
  abort: () => void;
}
```

----------------------------------------

TITLE: Refactoring Person Component for Better Prop Handling
DESCRIPTION: This code refactors the Person component to handle Draggable props more efficiently and avoid React warnings. It separates the provided props and innerRef to prevent spreading all props onto the DOM node.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/using-inner-ref.md#2025-04-21_snippet_6

LANGUAGE: diff
CODE:
```
class Person extends React.Component {
  render() {
-    return (
-      <div {...this.props} ref={this.props.innerRef}>
-        I am a person, I think..
-      </div>
-    );
  }
}
class Person extends React.Component {
  render() {
+    const { provided, innerRef } = this.props;
+    return (
+      <div
+        {...provided.draggableProps}
+        {...provided.dragHandleProps}
+        ref={innerRef}
+      >
+        I am a person, I think..
+      </div>
+    );
  }
}

<Draggable draggableId="draggable-1" index={0}>
  {(provided, snapshot) => (
    <Person
      innerRef={provided.innerRef}
-      {...provided.draggableProps}
-      {...provided.dragHandleProps}
+      provided={provided}
    />
  )}
</Draggable>
```

----------------------------------------

TITLE: Defining FluidDragActions Interface in TypeScript
DESCRIPTION: This snippet defines the FluidDragActions interface, which extends DragActions and adds a move method for fluid dragging operations.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/sensors/sensor-api.md#2025-04-21_snippet_6

LANGUAGE: typescript
CODE:
```
interface FluidDragActions extends DragActions {
  move: (clientSelection: Position) => void;
}
```

----------------------------------------

TITLE: HTML Button Role Assignment
DESCRIPTION: Demonstrates how to assign a button role to a div element

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/screen-reader.md#2025-04-21_snippet_4

LANGUAGE: html
CODE:
```
<div role="button">Oh no</div>
```

----------------------------------------

TITLE: Using @hello-pangea/dnd with UMD Bundle in Browser
DESCRIPTION: HTML and JavaScript example demonstrating how to use the UMD bundle of @hello-pangea/dnd directly in a browser environment. Includes loading React dependencies and basic component setup.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/about/installation.md#2025-04-21_snippet_2

LANGUAGE: html
CODE:
```
<!-- peer dependency -->
<script src="https://unpkg.com/react@16.3.1/umd/react.development.js"></script>
<!-- lib (change x.x.x for the version you would like) -->
<script src="https://unpkg.com/@hello-pangea/dnd@x.x.x/dist/dnd.js"></script>
<!-- needed to mount your react app -->
<script src="https://unpkg.com/react-dom@16.3.1/umd/react-dom.development.js"></script>

<script>
  const React = window.React;
  const ReactDOM = window.ReactDOM;
  const { DragDropContext, Draggable, Droppable } = window.ReactBeautifulDnd;

  function App() {
    // ...
  }

  // You can use JSX if your environment supports it
  ReactDOM.render(React.createElement(App), document.getElementById('app'));
</script>
```

----------------------------------------

TITLE: Importing DragDropContext from @hello-pangea/dnd
DESCRIPTION: Basic JavaScript import statement showing how to import the DragDropContext component from the @hello-pangea/dnd library after installation.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/about/installation.md#2025-04-21_snippet_1

LANGUAGE: javascript
CODE:
```
import { DragDropContext } from '@hello-pangea/dnd';
```

----------------------------------------

TITLE: Unsupported SVG Usage in @hello-pangea/dnd (JavaScript)
DESCRIPTION: This code snippet demonstrates an unsupported way of using an SVG element directly as a draggable component in @hello-pangea/dnd. This approach is not recommended due to accessibility and cross-browser compatibility issues.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/dragging-svgs.md#2025-04-21_snippet_0

LANGUAGE: javascript
CODE:
```
// ❌ not supported
<Draggable draggableId="not-supported" index={0}>
  {provided => (
    <svg
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      ref={provided.innerRef}
      {/* other SVG stuff */}
    />
  )}
</Draggable>
```

----------------------------------------

TITLE: Demonstrating Ref Behavior in React Components
DESCRIPTION: This code snippet illustrates the difference in ref behavior between React Components and ReactElements. It shows how refs work with custom components (Person) and native DOM elements (div).

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/using-inner-ref.md#2025-04-21_snippet_2

LANGUAGE: js
CODE:
```
class Person extends React.Component {
  state = {
    sayHello: false,
  };
  sayHello() {
    this.setState({
      sayHello: true,
    });
  }
  render() {
    if (this.state.sayHello) {
      return <div {...this.props}>Hello</div>;
    }

    return <div {...this.props}>'I am a person, I think..'</div>;
  }
}

class App extends React.Component {
  setPersonRef = (ref) => {
    this.personRef = ref;

    // When the ref changes it will firstly be set to null
    if (this.personRef) {
      // personRef is an instance of the Person class
      this.personRef.sayHello();
    }
  };
  setDivRef = (ref) => {
    this.divRef = ref;

    if (this.divRef) {
      // div ref is a HTMLElement
      this.divRef.style.backgroundColor = 'lightgreen';
    }
  };
  render() {
    return (
      <React.Fragment>
        <Person ref={this.setPersonRef} />
        <div ref={this.setDivRef}>hi there</div>
      </React.Fragment>
    );
  }
}
```

----------------------------------------

TITLE: Importing Meta Component from Storybook in JavaScript
DESCRIPTION: This snippet imports the Meta component from Storybook's blocks module. The Meta component is used to set metadata for the Storybook page.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/stories/Welcome.mdx#2025-04-21_snippet_0

LANGUAGE: JavaScript
CODE:
```
import { Meta } from "@storybook/blocks";
```

----------------------------------------

TITLE: DraggableProps Interface - TypeScript
DESCRIPTION: TypeScript interface defining the structure of draggableProps that can be spread onto draggable elements.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/api/draggable.md#2025-04-21_snippet_4

LANGUAGE: typescript
CODE:
```
// Props that can be spread onto the element directly
interface DraggableProps {
  // inline style
  style?: DraggableStyle;
  // used for shared global styles
  'data-rfd-draggable-context-id': ContextId;
  'data-rfd-draggable-id': DraggableId; // used to know when a transition ends
  onTransitionEnd?: TransitionEventHandler;
}
```

----------------------------------------

TITLE: Applying Transition to Draggable Elements in CSS
DESCRIPTION: Controls the movement of Draggable elements that need to move out of the way of a dragging Draggable. The transition string is dynamically set.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/preset-styles.md#2025-04-21_snippet_6

LANGUAGE: css
CODE:
```
transition: ${string};
```

----------------------------------------

TITLE: Changelog Entries - Development Environment Updates
DESCRIPTION: A collection of changelog entries documenting updates to dependencies, development tools, and environment configurations. Includes version upgrades for various packages and changes to development tooling.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/CHANGELOG.md#2025-04-21_snippet_0

LANGUAGE: markdown
CODE:
```
### Others 🔧

* **dependency manager:** change from dependabot to renovate ([#207](https://github.com/react-forked/dnd/issues/207)) ([2cabf88](https://github.com/react-forked/dnd/commit/2cabf88388c618ba29f33859806ea957288cf8c1))
* **deps:** update babel monorepo ([#213](https://github.com/react-forked/dnd/issues/213)) ([ae41388](https://github.com/react-forked/dnd/commit/ae41388b1b2b0985506a2945c1c0801dcbcf04e5))
* **deps:** update dependency css-box-model to ^1.2.1 ([#219](https://github.com/react-forked/dnd/issues/219)) ([b5c9846](https://github.com/react-forked/dnd/commit/b5c984622591192bffb723a74a5ccbe417989309))
```

----------------------------------------

TITLE: HTML Image and Header Structure
DESCRIPTION: Basic HTML structure for the project logo and title with centered alignment.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/README.md#2025-04-21_snippet_0

LANGUAGE: HTML
CODE:
```
<p align="center">
  <img src="https://user-images.githubusercontent.com/2182637/53611918-54c1ff80-3c24-11e9-9917-66ac3cef513d.png" alt="react beautiful dnd logo" />
</p>
<h1 align="center">@hello-pangea/dnd</h1>
```

----------------------------------------

TITLE: Incorrect Usage of innerRef with Custom Component
DESCRIPTION: This snippet demonstrates an incorrect way of using innerRef with a custom component in a Draggable context. This approach will cause errors as it passes the component instance instead of the DOM node.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/using-inner-ref.md#2025-04-21_snippet_3

LANGUAGE: js
CODE:
```
<Draggable draggableId="draggable-1" index={0}>
  {(provided, snapshot) => (
    <Person
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
    />
  )}
</Draggable>
```

----------------------------------------

TITLE: HTML Badge Display Section
DESCRIPTION: HTML div containing project badges for CI status, npm version, Discord, and commit standards.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/README.md#2025-04-21_snippet_1

LANGUAGE: HTML
CODE:
```
<div align="center">

**Beautiful** and **accessible** drag and drop for lists with [`React`](https://facebook.github.io/react/)

[![CircleCI branch](https://img.shields.io/circleci/project/github/hello-pangea/dnd/main.svg)](https://circleci.com/gh/hello-pangea/dnd/tree/main)
[![npm](https://img.shields.io/npm/v/@hello-pangea/dnd.svg)](https://www.npmjs.com/package/@hello-pangea/dnd)
[![Discord](https://img.shields.io/discord/1007763479010234398?color=blue)](https://discord.gg/zKhPpmvCEv)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-blue.svg)](https://conventionalcommits.org)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-blue.svg)](http://commitizen.github.io/cz-cli/)</div>
```

----------------------------------------

TITLE: Sample onDragEnd Callback After Dynamic Changes in Hello Pangea DnD
DESCRIPTION: This snippet shows the DropResult data structure received in onDragEnd after a Draggable has been removed during the drag operation. The source index reflects the changes that occurred during the drag.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/changes-while-dragging.md#2025-04-21_snippet_2

LANGUAGE: javascript
CODE:
```
{
  draggableId: 'item-1',,
  type: 'TYPE',
  source: {
    droppableId: 'droppable',
   // the source reflects the change
    index: 0,
  },
  destination: null,
  reason: 'DROP',
}
```

----------------------------------------

TITLE: Sample onDragUpdate Callback After Removing a Draggable in Hello Pangea DnD
DESCRIPTION: This code demonstrates the data structure received in onDragUpdate when a Draggable is removed during a drag operation. The source index is updated to reflect the new position after removal.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/changes-while-dragging.md#2025-04-21_snippet_1

LANGUAGE: javascript
CODE:
```
{
  draggableId: 'item-1',,
  type: 'TYPE',
  source: {
    droppableId: 'droppable',
   // item-1 is now in index 0 as item-0 is gone
    index: 0,
  },
  // adjusted destination
  destination: null,
}
```

----------------------------------------

TITLE: Removing Tap Highlight for Drag Handles in CSS
DESCRIPTION: Removes the grey overlay that Webkit browsers add to anchors when they are active, which can be confusing for users during drag operations.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/preset-styles.md#2025-04-21_snippet_1

LANGUAGE: css
CODE:
```
-webkit-tap-highlight-color: rgba(0, 0, 0, 0);
```

----------------------------------------

TITLE: Setting Touch Action for Drag Handles in CSS
DESCRIPTION: Prevents pull-to-refresh action and delayed anchor focus on Android Chrome, improving the dragging experience on mobile devices.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/preset-styles.md#2025-04-21_snippet_2

LANGUAGE: css
CODE:
```
touch-action: manipulation;
```

----------------------------------------

TITLE: Disabling Touch Callout for Drag Handles in CSS
DESCRIPTION: Prevents the context menu from appearing on long press for drag handles, which is necessary for starting a drag operation on touch devices.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/preset-styles.md#2025-04-21_snippet_0

LANGUAGE: css
CODE:
```
-webkit-touch-callout: none;
```

----------------------------------------

TITLE: Disabling Pointer Events for Droppable Elements During Drag in CSS
DESCRIPTION: Prevents hover styles from triggering on Droppable elements during a drag operation. This is optional and can be opted out of if desired.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/preset-styles.md#2025-04-21_snippet_7

LANGUAGE: css
CODE:
```
pointer-events: none;
```

----------------------------------------

TITLE: Disabling Pointer Events for All Elements During Drag in CSS
DESCRIPTION: An optional style that can be applied to prevent hover styles for the entire application during a drag operation.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/preset-styles.md#2025-04-21_snippet_8

LANGUAGE: css
CODE:
```
body > * {
  pointer-events: none;
}
```

----------------------------------------

TITLE: Defining SnapDragActions Interface in TypeScript
DESCRIPTION: This snippet defines the SnapDragActions interface, which extends DragActions and adds methods for snap dragging operations in different directions.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/sensors/sensor-api.md#2025-04-21_snippet_8

LANGUAGE: typescript
CODE:
```
export interface SnapDragActions extends DragActions {
  moveUp: () => void;
  moveDown: () => void;
  moveRight: () => void;
  moveLeft: () => void;
}
```

----------------------------------------

TITLE: Implementing Force Stop for Drag Lock in TypeScript
DESCRIPTION: This snippet demonstrates how to implement a force stop function for a drag lock, including cleanup of event listeners.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/sensors/sensor-api.md#2025-04-21_snippet_9

LANGUAGE: typescript
CODE:
```
function useMySensor(api: SensorAPI) {
  let unbindClick;

  function forceStop() {
    if (unbindClick) {
      unbindClick();
    }
  }

  const preDrag: PreDragActions | null = api.tryGetLock('item-1', forceStop);
  // Could not get lock
  if (!preDrag) {
    return;
  }

  const drag: SnapDragActions = preDrag.snapLift();
  const move = () => drag.moveDown();
  window.addEventListener('click', move);
  unbindClick = window.removeEventListener('click', move);
}
```

----------------------------------------

TITLE: Implementing Defensive Drag Actions in TypeScript
DESCRIPTION: This snippet shows how to defensively use drag actions by checking if the lock is still active before performing operations.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/sensors/sensor-api.md#2025-04-21_snippet_10

LANGUAGE: typescript
CODE:
```
function useMySensor(api: SensorAPI) {
  const preDrag: ?PreDragActions = api.tryGetLock();
  // Could not get lock
  if (!preDrag) {
    return;
  }

  const drag: SnapDragActions = preDrag.snapLift();
  const move = () => {
    if (drag.isActive()) {
      drag.moveDown();
      return;
    }
    // unbinding if no longer active
    window.removeEventListener('click', move);
  };
  window.addEventListener('click', move);
}
```

----------------------------------------

TITLE: Skipping Drop Animation in React Component
DESCRIPTION: Shows how to skip the drop animation by setting a near-zero transition duration. The implementation includes a getStyle function that sets transitionDuration to 0.001s (not 0s to ensure onTransitionEnd fires) and a TaskItem component example.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/drop-animation.md#2025-04-21_snippet_2

LANGUAGE: javascript
CODE:
```
function getStyle(style, snapshot) {
  if (!snapshot.isDropAnimating) {
    return style;
  }
  return {
    ...style,
    // cannot be 0, but make it super tiny
    transitionDuration: `0.001s`,
  };
}

function TaskItem(props) {
  const { task, index } = props;
  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          innerRef={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={getStyle(provided.draggableProps.style, snapshot)}
        >
          {task.content}
        </div>
      )}
    </Draggable>
  );
}
```

----------------------------------------

TITLE: DraggableRubric Interface
DESCRIPTION: TypeScript interface for the rubric object containing Draggable component metadata.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/api/draggable.md#2025-04-21_snippet_11

LANGUAGE: typescript
CODE:
```
interface DraggableRubric {
  draggableId: DraggableId;
  type: TypeId;
  source: DraggableLocation;
}
```

----------------------------------------

TITLE: Draggable Component Sibling Examples
DESCRIPTION: Demonstrates correct and incorrect implementations of Draggable component siblings, showing proper spacing and layout patterns.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/api/draggable.md#2025-04-21_snippet_6

LANGUAGE: javascript
CODE:
```
// Direct siblings ✅
<Draggable draggableId="draggable-1" index={0}>
  {() => {}}
</Draggable>
<Draggable draggableId="draggable-2" index={1}>
  {() => {}}
</Draggable>

// Not direct siblings, but are visible siblings ✅
<div>
  <Draggable draggableId="draggable-1" index={0}>
    {() => {}}
  </Draggable>
</div>
<div>
  <Draggable draggableId="draggable-2" index={1}>
    {() => {}}
  </Draggable>
</div>

// Spacer elements ❌
<Draggable draggableId="draggable-1" index={0}>
    {() => {}}
</Draggable>
<p>I will break things!</p>
<Draggable draggableId="draggable-2" index={1}>
    {() => {}}
</Draggable>

// Spacing on non sibling wrappers ❌
<div style={{padding: 10}}>
  <Draggable draggableId="draggable-1" index={0}>
    {() => {}}
  </Draggable>
</div>
<div style={{padding: 10}}>
  <Draggable draggableId="draggable-2" index={1}>
    {() => {}}
  </Draggable>
</div>
```

----------------------------------------

TITLE: HTML Accessibility Input Example
DESCRIPTION: Demonstrates how to implement accessible form controls with descriptive labels using aria-describedby

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/screen-reader.md#2025-04-21_snippet_1

LANGUAGE: html
CODE:
```
<label for="mob">Mobile</label>
<input type="tel" id="mob" aria-describedby="mobLength" />
<span id="mobLength">Mobile must contain 10 digits</span>
```

----------------------------------------

TITLE: HTML Interactive Content Configuration
DESCRIPTION: Example of making content interactive and focusable using tabindex

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/screen-reader.md#2025-04-21_snippet_3

LANGUAGE: html
CODE:
```
tabindex="0"
```

----------------------------------------

TITLE: Installing @hello-pangea/dnd via Package Managers
DESCRIPTION: Commands for installing the @hello-pangea/dnd package using npm, pnpm, or yarn package managers. Each command adds the package to your project dependencies.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/about/installation.md#2025-04-21_snippet_0

LANGUAGE: bash
CODE:
```
# npm
npm install @hello-pangea/dnd --save

# pnpm
pnpm add @hello-pangea/dnd

# yarn
yarn add @hello-pangea/dnd
```

----------------------------------------

TITLE: Setting HTML5 Doctype Declaration
DESCRIPTION: Shows the correct HTML5 doctype declaration that should be placed at the beginning of HTML documents. This declaration is required to ensure proper browser rendering and consistent layout behavior.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/doctype.md#2025-04-21_snippet_0

LANGUAGE: html
CODE:
```
<!doctype html>
```

----------------------------------------

TITLE: Defining BeforeCapture Interface in TypeScript for @hello-pangea/dnd
DESCRIPTION: Type definitions for the onBeforeCapture responder which is called before dimensions are collected. It provides limited information about the draggable item since the context might change during this phase.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/responders.md#2025-04-21_snippet_0

LANGUAGE: typescript
CODE:
```
// We cannot give more information as things might change in the
// onBeforeCapture responder!
export interface BeforeCapture {
  draggableId: DraggableId;
  mode: MovementMode;
}
// No second 'provided' argument
export type OnBeforeCaptureResponder = (before: BeforeCapture) => unknown;

// Otherwise the same type information as OnDragStartResponder
```

----------------------------------------

TITLE: TypeScript Definitions for Cloning API in hello-pangea/dnd
DESCRIPTION: This snippet provides TypeScript definitions for the renderClone prop of the <Droppable /> component and the DraggableChildrenFn type used in the cloning API. It specifies the function signature and parameters.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/guides/reparenting.md#2025-04-21_snippet_2

LANGUAGE: typescript
CODE:
```
renderClone: DraggableChildrenFn | null;

type DraggableChildrenFn = (
  provider: Provided,
  stateSnapshot: StateSnapshot,
  draggableRubric: DraggableRubric,
) => ReactNode | null;
```

----------------------------------------

TITLE: Standard Droppable Placeholder Usage in @hello-pangea/dnd
DESCRIPTION: Shows the normal implementation of a placeholder in non-virtual lists for reference. This approach is not suitable for virtual lists where dimensions are calculated differently.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/patterns/virtual-lists.md#2025-04-21_snippet_2

LANGUAGE: jsx
CODE:
```
<Droppable droppableId="droppable">
  {(provided, snapshot) => (
    <div ref={provided.innerRef} {...provided.droppableProps}>
      {/* Usually needed. But not for virtual lists! */}
      {provided.placeholder}
    </div>
  )}
</Droppable>
```

----------------------------------------

TITLE: Including Example GIF in Markdown
DESCRIPTION: Markdown syntax for embedding a GIF image demonstrating natural keyboard movement between lists using collision detection.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/about/design-principles.md#2025-04-21_snippet_0

LANGUAGE: markdown
CODE:
```
![example](https://raw.githubusercontent.com/alexreardon/files/master/resources/collision.gif?raw=true)
```

----------------------------------------

TITLE: Markdown Navigation Link
DESCRIPTION: Internal navigation link in markdown format to return to the main documentation section.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/docs/about/design-principles.md#2025-04-21_snippet_1

LANGUAGE: markdown
CODE:
```
[← Back to documentation](/README.md#documentation-)
```

----------------------------------------

TITLE: Setting Storybook Page Title using Meta Component in JSX
DESCRIPTION: This JSX snippet uses the Meta component to set the title of the Storybook page to 'Welcome'. This title will appear in the Storybook navigation.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/stories/Welcome.mdx#2025-04-21_snippet_1

LANGUAGE: JSX
CODE:
```
<Meta title="Welcome" />
```

----------------------------------------

TITLE: HTML Star History Chart
DESCRIPTION: Responsive image implementation for showing project star history with dark/light mode support.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/README.md#2025-04-21_snippet_2

LANGUAGE: HTML
CODE:
```
<a href="https://star-history.com/#hello-pangea/dnd&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=hello-pangea/dnd&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=hello-pangea/dnd&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=hello-pangea/dnd&type=Date" />
 </picture>
</a>
```

----------------------------------------

TITLE: PGP Public Key for Secure Communication with hello-pangea/dnd Security Team
DESCRIPTION: A PGP public key for encrypting security vulnerability reports when communicating with the project maintainers. This key belongs to security@100terres.com and should be used when sending sensitive security-related information.

SOURCE: https://github.com/hello-pangea/dnd/blob/main/SECURITY.md#2025-04-21_snippet_0

LANGUAGE: plaintext
CODE:
```
-----BEGIN PGP PUBLIC KEY BLOCK-----

xjMEZudOqxYJKwYBBAHaRw8BAQdAEKuhqqGU+VetloukkRjlK4JUupLnbINM
uvfqFoftpiPNL3NlY3VyaXR5QDEwMHRlcnJlcy5jb20gPHNlY3VyaXR5QDEw
MHRlcnJlcy5jb20+wowEEBYKAD4FgmbnTqsECwkHCAmQB30aju9veiYDFQgK
BBYAAgECGQECmwMCHgEWIQSRf0VkXiJAK6GWKsQHfRqO7296JgAArc4A/jCl
HTZqKK5GygHUluqo7bWhG+ZYIOmK0x0n5ikL3MHFAP99PV/NGoF3Vc6cUYQL
ZiNIXZOtUHBg49BxNpP//C1JAc44BGbnTqsSCisGAQQBl1UBBQEBB0AkKM+9
v9mgf7WvaeIfxicgc32fqf4XHEjP/D9xG9wTWwMBCAfCeAQYFgoAKgWCZudO
qwmQB30aju9veiYCmwwWIQSRf0VkXiJAK6GWKsQHfRqO7296JgAAoowBAOzz
GPOPr8VVLxzOAzAf3Q5FgTzaRaJG2wQWAIp06Dg8AQC1NROyADwIvPXA60kH
Il/++gLc+is8wCXLMOPq7RdsCw==
=QF0l
-----END PGP PUBLIC KEY BLOCK-----
```