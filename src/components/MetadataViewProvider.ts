/**
 * @file MetadataViewProvider.ts
 * @fileoverview - This file holds the MetadataViewProvider class implementation
 * which is used for getting SFCC Metadata from the sandbox instance and
 * populating the tree view instance.
 */

import {
  Event,
  EventEmitter,
  TreeDataProvider,
  TreeItemCollapsibleState,
  workspace,
  WorkspaceConfiguration
} from 'vscode';
import ObjectAttributeDefinition from '../documents/ObjectAttributeDefinition';
import ObjectAttributeGroup from '../documents/ObjectAttributeGroup';
import ObjectAttributeValueDefinition from '../documents/ObjectAttributeValueDefinition';
import ObjectTypeDefinition from '../documents/ObjectTypeDefinition';
import OCAPIHelper from '../helpers/OCAPIHelper';
import SitePreferencesHelper from '../helpers/SitePreferencesHelper';
import { ICallSetup } from '../services/ICallSetup';
import { OCAPIService } from '../services/OCAPIService';
import { MetadataNode } from './MetadataNode';

/**
 * @class MetadataViewProvider
 * @classdesc A generic tree data provider implementation that can be used for
 *    several getting data from the OCAPI service, and wiring the results to the
 *    TreeView instance.
 */
export class MetadataViewProvider
  implements TreeDataProvider<MetadataNode | undefined> {
  // Declare memeber variables.
  public readonly onDidChangeTreeData?: Event<MetadataNode | undefined>;
  public providerType: string = '';
  private eventEmitter: EventEmitter<MetadataNode | undefined> = null;
  private ocapiHelper = new OCAPIHelper();
  private service: OCAPIService = new OCAPIService();

  /**
   *
   * @param {string} providerType - The type of provider being initialized;
   * @param {EventEmitter<MetadataNode | undefined>} eventEmitter
   */
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
   * Refreshes the TreeView.
   */
  public refresh(): void {
    this.eventEmitter.fire();
  }

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
  public async getChildren(element?: MetadataNode): Promise<MetadataNode[]> {
    const spHelper = new SitePreferencesHelper(this.service);
    try {
      if (!element) {
        // Get the base nodes of the tree.
        return this.getRootChildren(element);
      } else {
        // Get children of expandable node types
        if (element.expandable) {
          const nodeType = element.nodeType;
          const root = element.rootTree;

          if (root === MetadataNode.ROOT_NODES.sitePrefs &&
            nodeType === 'objectAttributeDefinition'
          ) {
            return spHelper.getSitePreferenceSites(element);
          } else if (nodeType === 'site') {
            return spHelper.getSitePreference(element);
          } else if (nodeType === 'baseNodeName') {
            return this.getBaseNodeChildren(element);
          } else if (nodeType === 'objectTypeDefinition') {
            return this.getObjectDefinitionChildren(element);
          } else if (nodeType === 'parentContainer') {
            return this.getAttributeOrGroupContainerChildren(element);
          } else if (nodeType === 'objectAttributeDefinition') {
            return this.getAttributeDefinitionChildren(element);
          } else if (nodeType === 'objectAttributeGroup') {
            // If getting the site preferences, then use helper, otherwise call
            // local class instance method.
            return element.parentId === 'sitePreferences' ?
              spHelper.getPreferencesInGroup(element) :
              this.getAttributeGroupChildren(element);
          } else if (nodeType === 'objectAttributeValueDefinition') {
            return this.getAttributeValueDefinitionChildren(element);
          } else if (nodeType === 'objectAttributeValueDefinitions') {
            return this.ocapiHelper.getValueDefinitionNodes(element);
          } else if (nodeType === 'stringList') {
            return this.getStringListChildren(element);
          }
        } else {
          // Return an empty array for types that are not expandable.
          return [];
        }
      }
    } catch (e) {
      return Promise.reject(e.message);
    }
  }

  /**
   * Gets the children elements of parent container type nodes. This
   * method calls OCAPI to get attribute definitions or the attribute groups
   * depending on which node was expanded. This method is used for both custom &
   * system type object definitions.
   * @param {MetadataNode} element - The MetadataNode instance.
   * @return {Promise<MetadataNode[]>} - Returns a promise that will resolve to
   *    the child MetadataNodes array.
   */
  private async getAttributeOrGroupContainerChildren(
    element: MetadataNode
  ): Promise<MetadataNode[]> {
    const path = element.parentId.split('.');
    const objectType = path.pop();
    const parentType = path.pop();
    const isAttribute = element.name !== 'Attribute Groups';
    let _callSetup: ICallSetup = null;
    let _callResult: any;

    // If this is the node for attribute definitions.
    if (isAttribute) {
      // Get the System/Custom Object attributes.// Make the call to the OCAPI Service.
      try {
        _callSetup = await this.service.getCallSetup(
          parentType,
          'getAttributes',
          {
            count: 700,
            objectType,
            select: '(**)'
          }
        );

        _callResult = await this.service.makeCall(_callSetup);
      } catch (e) {
        throw new Error(e.toString());
      }

      // If the API call returns data create the first level of a tree.
      if (
        !_callResult.error &&
        typeof _callResult.data !== 'undefined' &&
        Array.isArray(_callResult.data)
      ) {
        return _callResult.data.map(resultObj => {
          return new MetadataNode(
            resultObj.id,
            TreeItemCollapsibleState.Collapsed,
            {
              parentId: element.parentId + '.' + objectType,
              objectAttributeDefinition: new ObjectAttributeDefinition(
                resultObj
              ),
              displayDescription: resultObj.display_name
                ? resultObj.display_name.default
                : ''
            }
          );
        });
      }

      // If there is an error display a single node indicating that there
      // was a failure to load the object definitions.
      return [
        new MetadataNode('Unable to load...', TreeItemCollapsibleState.None, {
          parentId: 'root.systemObjectDefinitions.' + objectType
        })
      ];
    } else {
      // Make the call to the OCAPI Service to get the attribute groups.
      // Tree branch for attribute groups.
      _callSetup = await this.service.getCallSetup(
        'systemObjectDefinitions',
        'getAttributeGroups',
        {
          select: '(**)',
          count: 150,
          expand: 'definition',
          objectType
        }
      );

      _callResult = await this.service.makeCall(_callSetup);

      // If the API call returns data create the first level of a tree.
      if (
        !_callResult.error &&
        typeof _callResult.data !== 'undefined' &&
        Array.isArray(_callResult.data)
      ) {
        return _callResult.data.map(resultObj => {
          return new MetadataNode(
            resultObj.id,
            TreeItemCollapsibleState.Collapsed,
            {
              parentId: element.parentId + '.' + objectType,
              objectAttributeGroup: new ObjectAttributeGroup(resultObj),
              displayDescription: resultObj.display_name
                ? resultObj.display_name.default
                : ''
            }
          );
        });
      } else if (
        !_callResult.error &&
        typeof _callResult.count !== 'undefined' &&
        _callResult.count === 0
      ) {
        // If there are no attribute groups defined then create a single node
        // with a message for the user.
        return [
          new MetadataNode(
            'No attribute groups defined',
            TreeItemCollapsibleState.None,
            {
              parentId: element.parentId + '.' + objectType
            }
          )
        ];
      }

      // If there is an error display a single node indicating that there
      // was a failure to load the object definitions.
      return [
        new MetadataNode('Unable to load...', TreeItemCollapsibleState.None, {
          parentId: element.parentId + '.' + objectType
        })
      ];
    }
  }

  /**
   * Gets the children elements of base tree nodes.
   * @param {MetadataNode} element - The MetadataNode instance.
   * @return {Promise<MetadataNode[]>} - Returns a promise that will resolve to
   *    the child MetadataNodes array.
   */
  private async getBaseNodeChildren(
    element: MetadataNode
  ): Promise<MetadataNode[]> {
    const baseName = element.baseNodeName;

    const callDataObj =  {
      count: 500,
      select: '(**)'
    };

    if (baseName === 'sitePreferences') {
      const spHelper = new SitePreferencesHelper(this.service);
      return await spHelper.getAllPreferences();
    }

    const _callSetup: ICallSetup = await this.service.getCallSetup(
      baseName,
      'getAll',
      callDataObj
    );

    // Call the OCAPI service.
    const _callResult = await this.service.makeCall(_callSetup);

    // If the API call returns data create a tree.
    if (_callResult.data && Array.isArray(_callResult.data)) {
      // Add the display name to the custom objects so that they can be
      // easily identified as custom.
      return _callResult.data.filter(obj => {
        return baseName === 'systemObjectDefinitions' ?
          (obj.object_type !== 'CustomObject') :
          (obj.object_type === 'CustomObject' && obj.display_name);
      }).map(filterdObj => {
        // Get the display name for the tree node.
        let name = '';
        if (baseName === 'systemObjectDefinitions') {
          name = filterdObj.object_type;
        } else if (baseName === 'customObjectDefinitions') {
          name = filterdObj.display_name.default;
        }

        // Create a MetaDataNode instance which implements the TreeItem
        // interface and holds the data of the document type that it
        // represents.
        return new MetadataNode(name, TreeItemCollapsibleState.Collapsed, {
          parentId: 'root.' + baseName,
          objectTypeDefinition: new ObjectTypeDefinition(filterdObj),
          displayDescription: ' '
        });
      });
    }
  }

  /**
   * Gets the base nodes of the tree that can be expanded for viewing data types.
   * @param {MetadataNode} element - The MetadataNode instance.
   * @return {Promise<MetadataNode[]>} - Returns a promise that will resolve to
   *    the child MetadataNodes array.
   */
  private async getRootChildren(
    element: MetadataNode
  ): Promise<MetadataNode[]> {
    const metaNodes: MetadataNode[] = [];

    // Get the workspace configuration object for all configuration settings
    // related to this extension.
    const workspaceConfig: WorkspaceConfiguration = workspace.getConfiguration(
      'extension.sfccmetadata'
    );

    // Get the VSCode settings for display of each base tree node.
    // - Show System Object Definitions
    const showSystemObjects: boolean = Boolean(
      workspaceConfig.get('explorer.systemobjects')
    );

    // - Show Custom Object Definitions
    const showCustomObjects: boolean = Boolean(
      workspaceConfig.get('explorer.customobjects')
    );

    // - Show Custom Object Definitions
    const showPreferences: boolean = Boolean(
      workspaceConfig.get('explorer.sitepreferences')
    );

    // If the user config is enabled, then show the option.
    if (showSystemObjects) {
      metaNodes.push(
        new MetadataNode(
          'System Object Definitions',
          TreeItemCollapsibleState.Collapsed,
          {
            parentId: 'root',
            baseNodeName: 'systemObjectDefinitions'
          }
        )
      );
    }

    // If display of Custom Object Definitions is enabled, add node to tree.
    if (showCustomObjects) {
      metaNodes.push(
        new MetadataNode(
          'Custom Object Definitions',
          TreeItemCollapsibleState.Collapsed,
          {
            parentId: 'root',
            baseNodeName: 'customObjectDefinitions'
          }
        )
      );
    }

    // If display of Site Preferences is enabled, add node to tree.
    if (showPreferences) {
      metaNodes.push(
        new MetadataNode(
          'Site Preferences',
          TreeItemCollapsibleState.Collapsed,
          {
            parentId: 'root',
            baseNodeName: 'sitePreferences'
          }
        )
      );
    }

    return Promise.resolve(metaNodes);
  }

  /**
   * Gets the children elements of System & Custom object type nodes.
   * @param {MetadataNode} element - The MetadataNode instance.
   * @return {Promise<MetadataNode[]>}
   */
  private async getObjectDefinitionChildren(
    element: MetadataNode
  ): Promise<MetadataNode[]> {
    const displayTextMap = {
      objectAttributeDefinitions: 'Attribute Definitions',
      objectAttributeGroups: 'Attribute Groups'
    };

    // Setup parent nodes for the attribute definition & the attribute
    // Group nodes to be added to.
    return Object.keys(displayTextMap).map(ctnrName => {
      const metaNode = new MetadataNode(
        displayTextMap[ctnrName],
        element.parentId.indexOf('customObjectDefinitions') > -1 ?
          TreeItemCollapsibleState.None :
          TreeItemCollapsibleState.Collapsed,
        {
          displayDescription:
            ctnrName === 'objectAttributeDefinitions'
              ? element.objectTypeDefinition.attributeDefinitionCount.toString()
              : element.objectTypeDefinition.attributeGroupCount.toString(),
          parentContainer: ctnrName,
          parentId:
            element.parentId + '.' + element.objectTypeDefinition.objectType
        }
      );

      return metaNode;
    });
  }

  /**
   * Gets the children elements of AttributeValueDefinition type nodes.
   * @param {MetadataNode} element - The MetadataNode instance.
   * @return {Promise<MetadataNode[]>}
   */
  private async getAttributeValueDefinitionChildren(
    element: MetadataNode
  ): Promise<MetadataNode[]> {
    return Object.keys(element.objectAttributeValueDefinition).map(key => {
      const value = element.objectAttributeValueDefinition[key];

      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        // == Primitive Types
        return new MetadataNode(
          key + ': ' + value,
          TreeItemCollapsibleState.None,
          {
            parentId: element.parentId + 'objectAttributeValueDefinition'
          }
        );
      } else {
        // == Localized String
        return new MetadataNode(
          key + ': ' + value.default,
          TreeItemCollapsibleState.None,
          {
            parentId: element.parentId + 'objectAttributeValueDefinition'
          }
        );
      }
    });
  }

  /**
   * Gets the children elements of ObjectAttributeGroup type nodes.
   * @param {MetadataNode} element - The MetadataNode instance.
   * @return {Promise<MetadataNode[]>}
   */
  private async getAttributeGroupChildren(
    element: MetadataNode
  ): Promise<MetadataNode[]> {
    const childNodes: MetadataNode[] = [];
    const attrGroup = element.objectAttributeGroup;
    const hasAttributes = attrGroup.attributeDefinitionsCount > 0;

    // Attribute Definitions
    if (hasAttributes) {
      const attrDefTitles = attrGroup.attributeDefinitions.map(
        attrDef => attrDef.id
      );

      childNodes.push(
        new MetadataNode('Attributes', TreeItemCollapsibleState.Collapsed, {
          parentId: element.parentId + '.' + attrGroup.id,
          stringList: attrDefTitles,
          displayDescription: attrGroup.attributeDefinitionsCount.toString()
        })
      );
    }

    const nodeMap = {
      displayName: 'display name'
    };

    [
      'id',
      'description',
      'displayName',
      'internal',
      'position',
      'link'
    ].forEach(property => {
      const propertyNode: MetadataNode = new MetadataNode(
        nodeMap[property] || property,
        TreeItemCollapsibleState.None,
        {
          parentId: element.parentId + '.' + attrGroup.id,
          displayDescription: attrGroup[property]
        }
      );

      childNodes.push(propertyNode);
    });

    return Promise.resolve(childNodes);
  }

  /**
   * Gets the children elements of ObjectAttributeDefinition type nodes.
   * @param {MetadataNode} element - The MetadataNode instance.
   * @return {Promise<MetadataNode[]>}
   */
  private async getAttributeDefinitionChildren(
    element: MetadataNode
  ): Promise<MetadataNode[]> {
    let objAttrDef: ObjectAttributeDefinition = element.objectAttributeDefinition;

    // Check if the attribute is an Enum type.
    if (objAttrDef.valueType.indexOf('enum') > -1) {
      // Call OCAPI to get the value definitions of the attribute.
      const attrAPIObj = await this.ocapiHelper.getExpandedAttribute(element);

      if (attrAPIObj) {
        objAttrDef = new ObjectAttributeDefinition(attrAPIObj);
      }
    }

    // Loop through the member properties and handle each possible type
    // for display as a node on the tree.
    return Object.keys(objAttrDef).map(key => {
      // == Primitive Types
      if (
        typeof objAttrDef[key] === 'string' ||
        typeof objAttrDef[key] === 'number' ||
        typeof objAttrDef[key] === 'boolean'
      ) {
        return new MetadataNode(
          key + ' : ' + objAttrDef[key],
          TreeItemCollapsibleState.None,
          {
            parentId:
              element.parentId + '.' + element.objectAttributeDefinition.id
          }
        );
      } else if (
        // == Localized Strings
        typeof objAttrDef[key] === 'object' &&
        objAttrDef[key] !== null &&
        typeof objAttrDef[key].default === 'string'
      ) {
        return new MetadataNode(
          key + ' : ' + objAttrDef[key].default,
          TreeItemCollapsibleState.None,
          {
            parentId:
              element.parentId + '.' + element.objectAttributeDefinition.id
          }
        );
      } else if (objAttrDef[key] instanceof ObjectAttributeValueDefinition) {
        // == ObjectAttributeValueDefinition
        if (typeof objAttrDef[key].id !== 'undefined') {
          return new MetadataNode(
            key + ': ' + objAttrDef[key].id,
            TreeItemCollapsibleState.Collapsed,
            {
              objectAttributeValueDefinition: objAttrDef[key],
              parentId:
                element.parentId + '.' + element.objectAttributeDefinition.id
            }
          );
        }
        return new MetadataNode(
          key + ': (undefined)',
          TreeItemCollapsibleState.None,
          {
            objectAttributeValueDefinition: objAttrDef[key],
            parentId:
              element.parentId + '.' + element.objectAttributeDefinition.id
          }
        );
      } else if (Array.isArray(objAttrDef[key]) && objAttrDef[key].length) {
          // == ObjectAttributeValueDefinition[]
          return new MetadataNode('Value Definitions',
            TreeItemCollapsibleState.Collapsed,
            {
              objectAttributeValueDefinitions: objAttrDef[key],
              parentId: element.parentId + '.' + element.objectAttributeDefinition.id
            }
          );
      }
    });
  }

  /**
   * Gets the children elements simple string array type nodes.
   * @param {MetadataNode} element - The MetadataNode instance.
   * @return {Promise<MetadataNode[]>}
   */
  private async getStringListChildren(
    element: MetadataNode
  ): Promise<MetadataNode[]> {
    return element.stringList.map(
      str =>
        new MetadataNode(str, TreeItemCollapsibleState.None, {
          parentId: element.parentId + '.' + element.name,
          groupAttribute: element.parentId.split('.').pop()
        })
    );
  }
}
