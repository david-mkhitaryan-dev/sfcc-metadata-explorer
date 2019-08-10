/**
 * @file SitePreferencesHelper.ts
 * @fileoverview - Exports a class with helper methods for handling API
 *    operations for Site Preferences related calls.
 */

 import { MetadataNode } from '../components/MetadataNode';
import { OCAPIService } from '../services/OCAPIService';
import ObjectAttributeGroup from '../documents/ObjectAttributeGroup';
import { TreeItemCollapsibleState } from 'vscode';

/**
 * @class
 * @classdesc - A class that includes helper functions for making calls to the
 *    Open Commerce API for Site Preference display in the tree view.
 */
export default class SitePreferencesHelper {
  private service: OCAPIService;

  /**
   * @param {OCAPIService} service - The OCAPI service instance used to
   *    make calls to the SFCC instance.
   * @constructor
   */
  constructor(service: OCAPIService) {
    this.service = service
  }

  /**
   * getAllPreferences
   */
  public async getAllPreferences(): Promise<MetadataNode[]> {
    let _callSetup = await this.service.getCallSetup(
      'systemObjectDefinitions',
      'getAttributeGroups',
      {
        select: '(**)',
        expand: 'definition',
        objectType: 'SitePreferences'
      }
    );

    let _callResult = await this.service.makeCall(_callSetup);

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
            parentId: 'sitePreferences',
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
            parentId: 'sitePreferences'
          }
        )
      ];
    }

  }

  public async getSitePreference(preferenceId): Promise<MetadataNode[]> {
    return null;
  }
}
