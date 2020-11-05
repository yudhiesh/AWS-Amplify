import React, { useEffect, useReducer } from "react";
import { API } from "aws-amplify";
import { List } from "antd";
import "antd/dist/antd.css";
import { listTodos } from "./graphql/queries";
import "./App.css";

interface IForm {
  name: string;
  description: string;
}

interface IInitialState {
  notes: [];
  loading: boolean;
  error: boolean;
  form: IForm;
}

interface IAction {
  type: string;
  payload: any;
}

const initialState: IInitialState = {
  notes: [],
  loading: true,
  error: false,
  form: { name: "", description: "" }
};

function reducer(state: IInitialState, action: IAction): IInitialState {
  switch (action.type) {
    case "SET_NOTES":
      return { ...state, notes: action.payload, loading: false };
    case "ERROR":
      return { ...state, loading: false, error: true };
    default:
      return state;
  }
}

function App() {
  const [state, dispatch] = useReducer(reducer, initialState);

  async function fetchTodos() {
    try {
      const notesData = await API.graphql({
        query: listTodos
      });
      dispatch({ type: "SET_NOTES", payload: notesData });
    } catch (error) {}
  }
  useEffect(() => {
    fetchTodos();
  }, []);

  return <div></div>;
}

export default App;
