/**
 * @file MetadataViewProvider.ts
 * @fileoverview - This file holds the MetadataViewProvider class implementation
 * which is used for getting SFCC Metadata from the sandbox instance and
 * populating the tree view instance.
 */

import { MetadataNode } from './MetadataNode';
import { Event, EventEmitter, TreeDataProvider, TreeItemCollapsibleState, TreeItem } from 'vscode';
import { OCAPIService } from '../service/OCAPIService';
import { ICallSetup } from '../service/ICallSetup';

/**
 * @class MetadataViewProvider
 * @classdesc A generic tree data provider implementation that can be used for
 *    several getting data from the OCAPI service, and wiring the results to the
 *    TreeView instance.
 */
export class MetadataViewProvider
  implements TreeDataProvider<MetadataNode | undefined> {
  readonly onDidChangeTreeData?: Event<MetadataNode | undefined>;

  public providerType: string = '';
  private eventEmitter: EventEmitter<MetadataNode | undefined> = null;

  constructor(
    providerType: string,
    eventEmitter: EventEmitter<MetadataNode | undefined>
  ) {
    this.providerType = providerType;
    this.eventEmitter = eventEmitter;
    this.onDidChangeTreeData = this.eventEmitter.event;
  }

  /* ========================================================================
   * Public Instance Methods
   * ======================================================================== */

  /**
   * Returns the individual TreeItem instance
   * @param {MetadataNode} element - The element associated with the given
   *    TreeItem instance.
   * @return {TreeItem | Thenable<TreeItem>} - Returns the instance of the
   *    TreeItem or a Promise that resolves to the TreeItem instance.
   */
  public getTreeItem(element: MetadataNode): MetadataNode {
    return element;
  }

  /**
   * Gets the children elements that are bound to the TreeItem instances for
   * rendering of the TreeView instance.
   * @param {MetadataNode} [element] - An optional parameter to use as the
   *    starting point for expansion of the tree when selected.
   * @return {Promise<MetadataNode[]>}
   */
  async getChildren(element?: MetadataNode): Promise<MetadataNode[]> {
    if (!element) {
      // If no element was passed, then refresh the root data.
      const service: OCAPIService = new OCAPIService();
      let _callSetup: ICallSetup = null;
      let _callResult: any;

      try {
        _callSetup = await service.getCallSetup(
          'systemObjectDefinitions',
          'getAll',
          { select: '(**)' }
        );
        _callResult = await service.makeCall(_callSetup);

        // If the API call returns data, then map each data item to a TreeItem.
        if (_callResult.data && Array.isArray(_callResult.data)) {
          return _callResult.data.map(sysObj => {
            console.log(sysObj);
            let name = sysObj.object_type === 'CustomObject' &&
              typeof sysObj.display_name !== 'undefined' ?
              sysObj.display_name.default + ' (CustomObject)' :
              sysObj.object_type;
            const node = new MetadataNode(name, TreeItemCollapsibleState.None);
            return node;
          });
        }
      } catch (e) {
        console.error(e);
        return Promise.reject(e);
      }
    } else {
      // If an element was passed in, then get the specific data for that call.
      /** @todo */
    }
  }
}
