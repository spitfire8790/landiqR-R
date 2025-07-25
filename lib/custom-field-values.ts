/**
 * Custom Field Values Extractor for Land iQ
 * Extracts unique values for the custom fields defined in pipedrive-types.ts
 */

import { pipedriveService } from './pipedrive-service';

interface CustomFieldValues {
  deals: {
    source: string[];
    opportunityLeader: Array<{ id: number; name: string }>;
    category: string[];
    paymentDue: string[];
    invoiceSent: string[];
    paymentReceived: string[];
  };
  persons: {
    approver: Array<{ id: number; name: string }>;
    businessUnit: string[];
    customerType: string[];
  };
  organisations: {
    locationOfWork: string[];
    organisationGroup: string[];
    network: string[];
    licencePool: string[];
    issuedLicences: number[];
  };
}

export class CustomFieldValuesExtractor {
  private mappings = pipedriveService.getCustomFieldMappings();

  /**
   * Extract all unique values for custom fields
   */
  async extractAllCustomFieldValues(): Promise<CustomFieldValues> {
    console.log('🔍 Extracting custom field values from Pipedrive data...');
    
    // First fetch field definitions to get human-readable names and options
    console.log('📋 Fetching field definitions...');
    const fieldDefinitions = await pipedriveService.getAllCustomFields();
    
    const [deals, persons, organisations, users] = await Promise.all([
      pipedriveService.fetchDeals(),
      pipedriveService.fetchPersons(),
      pipedriveService.fetchOrganisations(),
      pipedriveService.fetchUsers()
    ]);

    console.log(`📊 Data loaded: ${deals.length} deals, ${persons.length} persons, ${organisations.length} organisations, ${users.length} users`);

    return {
      deals: this.extractDealFieldValues(deals, users, fieldDefinitions.dealFields),
      persons: this.extractPersonFieldValues(persons, users, fieldDefinitions.personFields),
      organisations: this.extractOrganisationFieldValues(organisations, fieldDefinitions.organizationFields)
    };
  }

  /**
   * Extract unique values from deals
   */
  private extractDealFieldValues(deals: any[], users: any[], fieldDefinitions: any[]) {
    const userMap = new Map(users.map(user => [user.id, user.name]));
    
    const sourceValues = new Set<string>();
    const opportunityLeaderValues = new Set<number>();
    const categoryValues = new Set<string>();
    const paymentDueValues = new Set<string>();
    const invoiceSentValues = new Set<string>();
    const paymentReceivedValues = new Set<string>();

    deals.forEach(deal => {
      // Source
      const source = deal[this.mappings.deals.source];
      if (source) sourceValues.add(String(source));

      // Opportunity Leader
      const leader = deal[this.mappings.deals.opportunityLeader];
      if (leader) opportunityLeaderValues.add(Number(leader));

      // Category
      const category = deal[this.mappings.deals.category];
      if (category) categoryValues.add(String(category));

      // Payment Due
      const paymentDue = deal[this.mappings.deals.paymentDue];
      if (paymentDue) paymentDueValues.add(String(paymentDue));

      // Invoice Sent
      const invoiceSent = deal[this.mappings.deals.invoiceSent];
      if (invoiceSent) invoiceSentValues.add(String(invoiceSent));

      // Payment Received
      const paymentReceived = deal[this.mappings.deals.paymentReceived];
      if (paymentReceived) paymentReceivedValues.add(String(paymentReceived));
    });

    return {
      source: this.mapFieldValues(Array.from(sourceValues), this.mappings.deals.source, fieldDefinitions),
      opportunityLeader: Array.from(opportunityLeaderValues)
        .map(id => ({ id, name: userMap.get(id) || `User ${id}` }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      category: this.mapFieldValues(Array.from(categoryValues), this.mappings.deals.category, fieldDefinitions),
      paymentDue: this.mapFieldValues(Array.from(paymentDueValues), this.mappings.deals.paymentDue, fieldDefinitions),
      invoiceSent: this.mapFieldValues(Array.from(invoiceSentValues), this.mappings.deals.invoiceSent, fieldDefinitions),
      paymentReceived: this.mapFieldValues(Array.from(paymentReceivedValues), this.mappings.deals.paymentReceived, fieldDefinitions)
    };
  }

  /**
   * Map raw field values to human-readable labels using field definitions
   */
  private mapFieldValues(rawValues: string[], fieldKey: string, fieldDefinitions: any[]): string[] {
    const field = fieldDefinitions.find(f => f.key === fieldKey);
    if (!field || !field.options || !Array.isArray(field.options)) {
      // If no field definition or options found, return raw values
      console.warn(`⚠️ No field definition found for ${fieldKey}, returning raw values`);
      return rawValues.sort();
    }

    // Log the ID mappings for key fields we care about
    const keyFields = ['customerType', 'network', 'licencePool'];
    if (keyFields.includes(fieldKey)) {
      console.log(`\n📋 ID Mappings for field: ${fieldKey}`);
      console.log('Raw field definition:', {
        key: field.key,
        name: field.name,
        field_type: field.field_type,
        options: field.options
      });
      
      // Create the ID -> Label mapping
      const idMappings: Record<string, string> = {};
      field.options.forEach((opt: any) => {
        idMappings[String(opt.id)] = opt.label;
      });
      
      console.log(`🗂️ ID to Label mappings for ${fieldKey}:`, idMappings);
      console.log(`📝 TypeScript mapping format:`);
      console.log(`${fieldKey}: {`);
      Object.entries(idMappings).forEach(([id, label]) => {
        console.log(`  "${id}": "${label}",`);
      });
      console.log(`}`);
    }

    const mappedValues = rawValues.map(rawValue => {
      const option = field.options.find((opt: any) => String(opt.id) === String(rawValue));
      return option ? option.label : rawValue;
    });

    return mappedValues.sort();
  }

  /**
   * Extract unique values from persons
   */
  private extractPersonFieldValues(persons: any[], users: any[], fieldDefinitions: any[]) {
    const userMap = new Map(users.map(user => [user.id, user.name]));
    
    const approverValues = new Set<number>();
    const businessUnitValues = new Set<string>();
    const customerTypeValues = new Set<string>();

    persons.forEach(person => {
      // Approver
      const approver = person[this.mappings.persons.approver];
      if (approver) approverValues.add(Number(approver));

      // Business Unit
      const businessUnit = person[this.mappings.persons.businessUnit];
      if (businessUnit) businessUnitValues.add(String(businessUnit));

      // Customer Type
      const customerType = person[this.mappings.persons.customerType];
      if (customerType) customerTypeValues.add(String(customerType));
    });

    return {
      approver: Array.from(approverValues)
        .map(id => ({ id, name: userMap.get(id) || `User ${id}` }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      businessUnit: this.mapFieldValues(Array.from(businessUnitValues), this.mappings.persons.businessUnit, fieldDefinitions),
      customerType: this.mapFieldValues(Array.from(customerTypeValues), this.mappings.persons.customerType, fieldDefinitions)
    };
  }

  /**
   * Extract unique values from organisations
   */
  private extractOrganisationFieldValues(organisations: any[], fieldDefinitions: any[]) {
    const locationOfWorkValues = new Set<string>();
    const organisationGroupValues = new Set<string>();
    const networkValues = new Set<string>();
    const licencePoolValues = new Set<string>();
    const issuedLicencesValues = new Set<number>();

    organisations.forEach(org => {
      // Location of Work (array field)
      const locationOfWork = org[this.mappings.organisations.locationOfWork];
      if (Array.isArray(locationOfWork)) {
        locationOfWork.forEach(location => locationOfWorkValues.add(String(location)));
      } else if (locationOfWork) {
        locationOfWorkValues.add(String(locationOfWork));
      }

      // Organisation Group
      const orgGroup = org[this.mappings.organisations.organisationGroup];
      if (orgGroup) organisationGroupValues.add(String(orgGroup));

      // Network
      const network = org[this.mappings.organisations.network];
      if (network) networkValues.add(String(network));

      // Licence Pool
      const licencePool = org[this.mappings.organisations.licencePool];
      if (licencePool) licencePoolValues.add(String(licencePool));

      // Issued Licences
      const issuedLicences = org[this.mappings.organisations.issuedLicences];
      if (issuedLicences) issuedLicencesValues.add(Number(issuedLicences));
    });

    return {
      locationOfWork: this.mapFieldValues(Array.from(locationOfWorkValues), this.mappings.organisations.locationOfWork, fieldDefinitions),
      organisationGroup: this.mapFieldValues(Array.from(organisationGroupValues), this.mappings.organisations.organisationGroup, fieldDefinitions),
      network: this.mapFieldValues(Array.from(networkValues), this.mappings.organisations.network, fieldDefinitions),
      licencePool: this.mapFieldValues(Array.from(licencePoolValues), this.mappings.organisations.licencePool, fieldDefinitions),
      issuedLicences: Array.from(issuedLicencesValues).sort((a, b) => a - b)
    };
  }

  /**
   * Get unique values for a specific field
   */
  async getFieldValues(entityType: 'deals' | 'persons' | 'organisations', fieldName: string): Promise<any[]> {
    const allValues = await this.extractAllCustomFieldValues();
    
    const entityValues = allValues[entityType] as any;
    const fieldValues = entityValues[fieldName];
    
    if (!fieldValues) {
      throw new Error(`Field '${fieldName}' not found in ${entityType}`);
    }
    
    return fieldValues;
  }

  /**
   * Print all custom field values to console (for debugging)
   */
  async logAllFieldValues(): Promise<void> {
    const values = await this.extractAllCustomFieldValues();
    
    console.log('\n🎯 DEALS CUSTOM FIELD VALUES:');
    console.log('Source:', values.deals.source);
    console.log('Opportunity Leaders:', values.deals.opportunityLeader);
    console.log('Categories:', values.deals.category);
    console.log('Payment Due:', values.deals.paymentDue);
    console.log('Invoice Sent:', values.deals.invoiceSent);
    console.log('Payment Received:', values.deals.paymentReceived);
    
    console.log('\n👤 PERSONS CUSTOM FIELD VALUES:');
    console.log('Approvers:', values.persons.approver);
    console.log('Business Units:', values.persons.businessUnit);
    console.log('Customer Types:', values.persons.customerType);
    
    console.log('\n🏢 ORGANISATIONS CUSTOM FIELD VALUES:');
    console.log('Location of Work:', values.organisations.locationOfWork);
    console.log('Organisation Groups:', values.organisations.organisationGroup);
    console.log('Networks:', values.organisations.network);
    console.log('Licence Pools:', values.organisations.licencePool);
    console.log('Issued Licences:', values.organisations.issuedLicences);
  }
}

// Export singleton instance
export const customFieldValuesExtractor = new CustomFieldValuesExtractor(); 