import React, { useEffect, useReducer } from "react";
import API, { graphqlOperation, GraphQLResult } from "@aws-amplify/api";
import { listNotes } from "./graphql/queries";
import {
  updateNote as UpdateNote,
  createNote as CreateNote,
  deleteNote as DeleteNote
} from "./graphql/mutations";
import { onCreateNote } from "./graphql/subscriptions";
import { OnCreateNoteSubscription } from "./API";
import { Observable } from "./../node_modules/zen-observable-ts";
import { CreateNoteInput, ListNotesQuery } from "./API";
import { List, Input, Button } from "antd";
import { v4 as uuid } from "uuid";
import "antd/dist/antd.css";
import "./App.css";

const styles = {
  container: { padding: 20 },
  input: { marginBottom: 10 },
  item: { textAlign: "left" as const },
  p: { color: "#1890ff" }
};

const CLIENT_ID = uuid();

interface IForm {
  name: string;
  description: string;
  value?: string;
}

interface INote {
  name: string;
  description: string;
  id: UUID;
  clientID?: UUID | null;
  createdAt: string;
  updatedAt: string;
  completed: boolean;
}

interface IInitialState {
  notes: INote[];
  loading: boolean;
  error: boolean;
  form: IForm;
}

type UUID = typeof uuid;

const initialState: IInitialState = {
  notes: [],
  loading: true,
  error: false,
  form: { name: "", description: "" }
};

function reducer(state: IInitialState, action: any) {
  switch (action.type) {
    case "SET_NOTES":
      return { ...state, notes: action.notes, loading: false };
    case "ERROR":
      return { ...state, loading: false, error: true };
    case "ADD_NOTE":
      return { ...state, notes: [action.note, ...state.notes] };
    case "RESET_FORM":
      return { ...state, form: initialState.form };
    case "SET_INPUT":
      return { ...state, form: { ...state.form, [action.name]: action.value } };
    default:
      return state;
  }
}
function App() {
  const [state, dispatch] = useReducer(reducer, initialState);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    dispatch({ type: "SET_INPUT", name: e.target.name, value: e.target.value });
  }

  async function fetchTodos() {
    try {
      const notesData = (await API.graphql(
        graphqlOperation(listNotes)
      )) as GraphQLResult<ListNotesQuery>;
      dispatch({ type: "SET_NOTES", notes: notesData?.data?.listNotes?.items });
      // Object is possibly null
    } catch (error) {
      console.log(error);
      dispatch({ type: "ERROR" });
    }
  }

  async function createNote() {
    const { form } = state;
    if (!form.name || !form.description) {
      return alert("Please enter a name and a description");
    }
    const note = { ...form, clientID: CLIENT_ID, completed: false, id: uuid() };
    dispatch({ type: "ADD_NOTE", note });
    dispatch({ type: "RESET_FORM" });
    try {
      await API.graphql(graphqlOperation(CreateNote, { input: note }));
      console.log("Successfully created a note");
    } catch (error) {
      console.log(error);
    }
  }

  async function deleteNotes({ id }: { id: UUID }) {
    const index = state.notes.findIndex((n: INote) => n.id === id);
    const notes = [
      ...state.notes.slice(0, index),
      ...state.notes.slice(index + 1)
    ];
    dispatch({ type: "SET_NOTES", notes });
    try {
      await API.graphql(graphqlOperation(DeleteNote, { input: { id } }));
      console.log("Successfully deleted note");
    } catch (error) {
      console.log(error);
    }
  }

  async function updateNote(note: INote) {
    const { id } = note;
    const index = state.notes.findIndex((n: INote) => n.id === id);
    const notes = [...state.notes];
    notes[index].completed = !note.completed;
    dispatch({ type: "SET_NOTES", notes });
    try {
      await API.graphql(graphqlOperation(UpdateNote, { input: id }));
      console.log("Note successfully updated");
    } catch (error) {
      console.log(error);
    }
  }

  function renderItem(item: INote): JSX.Element {
    return (
      <List.Item
        style={styles.item}
        actions={[
          <p style={styles.p} onClick={() => deleteNotes(item)}>
            Delete
          </p>,
          <p style={styles.p} onClick={() => updateNote(item)}>
            {item.completed ? "Completed" : "Not Completed"}
          </p>
        ]}
      >
        <List.Item.Meta title={item.name} description={item.description} />
      </List.Item>
    );
  }

  useEffect(() => {
    fetchTodos();
    // Subscriptions enable real time updates
    // Whenever there is a new todo, the subscription will emit the new todo
    const pubSubClient = API.graphql(
      graphqlOperation(onCreateNote)
    ) as Observable<object>;
    const subscription = pubSubClient.subscribe({
      next: (noteData: GraphQLResult<OnCreateNoteSubscription>) => {
        const note = noteData?.data?.onCreateNote;
        if (CLIENT_ID === note?.clientID) return;
        dispatch({ type: "ADD_NOTE", note });
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <div style={styles.container}>
      <Input
        onChange={onChange}
        value={state.form.name}
        placeholder="Note Name"
        name="name"
        style={styles.input}
      />
      <Input
        onChange={onChange}
        value={state.form.description}
        placeholder="Description"
        name="description"
        style={styles.input}
      />
      <Button onClick={createNote} type="primary">
        Create note
      </Button>
      <List
        loading={state.loading}
        dataSource={state.notes}
        renderItem={renderItem}
      />
    </div>
  );
}

export default App;
