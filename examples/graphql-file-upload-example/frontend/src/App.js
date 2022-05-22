import logo from './logo.svg';
import './App.css';
import Files from './Files';
import UploadFile from './UploadFile';
import { ApolloProvider } from '@apollo/client';
import apolloClient from './apolloClient';

function App() {
  return (
    <ApolloProvider client={apolloClient}>
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <UploadFile />
          <Files />
        </header>
      </div>
    </ApolloProvider>
  );
}

export default App;
