import { Logger } from '@graphql-mesh/types';
import { SoapEndpoint, SoapType, SoapField, SoapService, SoapPort, SoapOperation } from '../soap2graphql/soap-endpoint';
import { NodeSoapClient } from './node-soap';
import { NodeSoapWsdlResolver } from './node-soap-resolver';

export function createSoapEndpoint(soapClient: NodeSoapClient, logger: Logger): SoapEndpoint {
  return new NodeSoapEndpoint(soapClient, logger);
}

export class NodeSoapEndpoint implements SoapEndpoint {
  private _resolver: NodeSoapWsdlResolver;

  constructor(private soapClient: NodeSoapClient, logger: Logger) {
    this._resolver = new NodeSoapWsdlResolver(this.soapClient.wsdl, logger);
  }

  description(): string {
    return this.soapClient.wsdl.toXML();
  }

  services(): NodeSoapService[] {
    const services: NodeSoapService[] = [];
    const content: any = this.describe();
    for (const key in content) {
      services.push(new NodeSoapService(this, key, content[key]));
    }
    return services;
  }

  resolver(): NodeSoapWsdlResolver {
    return this._resolver;
  }

  private _describe: any = null;
  protected describe(): any {
    if (!this._describe) {
      this._describe = this.soapClient.describe();
    }
    return this._describe;
  }
}

export class NodeSoapService implements SoapService {
  constructor(private _wsdl: NodeSoapEndpoint, private _name: string, private _content: any) {}

  endpoint(): NodeSoapEndpoint {
    return this._wsdl;
  }

  name(): string {
    return this._name;
  }

  private _ports: NodeSoapPort[] = null;
  ports(): NodeSoapPort[] {
    if (!this._ports) {
      this._ports = this.createPorts();
    }
    return this._ports;
  }

  private createPorts(): NodeSoapPort[] {
    const ports: NodeSoapPort[] = [];
    for (const key in this._content) {
      ports.push(new NodeSoapPort(this, key, this._content[key]));
    }
    return ports;
  }
}

export class NodeSoapPort implements SoapPort {
  constructor(private _service: NodeSoapService, private _name: string, private _content: any) {}

  endpoint(): NodeSoapEndpoint {
    return this.service().endpoint();
  }

  service(): NodeSoapService {
    return this._service;
  }

  name(): string {
    return this._name;
  }

  private _operations: NodeSoapOperation[] = null;
  operations(): NodeSoapOperation[] {
    if (!this._operations) {
      this._operations = this.createOperations();
    }
    return this._operations;
  }

  private createOperations(): NodeSoapOperation[] {
    const operations: NodeSoapOperation[] = [];
    for (const key in this._content) {
      operations.push(new NodeSoapOperation(this, key, this._content[key]));
    }
    return operations;
  }
}

export class NodeSoapOperation implements SoapOperation {
  constructor(private _port: NodeSoapPort, private _name: string, private _content: any) {}

  endpoint(): NodeSoapEndpoint {
    return this.port().endpoint();
  }

  service(): NodeSoapService {
    return this.port().service();
  }

  port(): NodeSoapPort {
    return this._port;
  }

  name(): string {
    return this._name;
  }

  content(): any {
    return this._content;
  }

  private _inputs: SoapField[] = null;
  args(): SoapField[] {
    if (!this._inputs) {
      this._inputs = this.endpoint().resolver().createOperationArgs(this);
    }
    return this._inputs;
  }

  private _output: { type: { type: SoapType; isList: boolean }; resultField: string } = null;
  output(): { type: SoapType; isList: boolean } {
    if (!this._output) {
      this._output = this.createOutput();
    }
    return this._output.type;
  }

  resultField(): string {
    if (!this._output) {
      this._output = this.createOutput();
    }
    return this._output.resultField;
  }

  private createOutput(): { type: { type: SoapType; isList: boolean }; resultField: string } {
    return this.endpoint().resolver().createOperationOutput(this);
  }
}
