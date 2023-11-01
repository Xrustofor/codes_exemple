/*
* Це не Vue Але Angular (Останній код який я писав)
* Тут добре показано використання TypeScript та деяка реалізація функцій.
* За принципом. Кожна функція має виконувати тільки одну дію.
* (У цьому коді описано, по більшій мірі, формування query параметрів для адресної строки ) (Фільтрація данних)
* */

import { Component, ElementRef, OnInit, ViewChild } from "@angular/core";
import { CampaignsService } from "../../services/campaigns.service";
import { IDataCampaign, IresDeleteCampaign } from "../../interfaces/main/campaign.interface";
import { ToastService } from "src/app/services/toast.service";
import { IMetaPagination } from "src/app/interfaces/shared/meta-pagination.interfaces";
import { Router, ActivatedRoute } from '@angular/router';
import { Utility } from "src/app/utility";
import { ISorted, QueryService } from "src/app/services/query.service";
import { IPagination } from "src/app/interfaces/shared/pagination.interface";
import { ITableColumnsMeta } from "src/app/interfaces/shared/meta-table-items.interface";
import { AgencyService } from "src/app/services/agency.service";
import { IKeyValueString, IProperty, IPropertyAny, IPropertyString } from "src/app/interfaces/global/global.interfaces";
import { STATUS_COLOR } from "src/app/constants/status";

const PREFIX_SORT = 's';

@Component({
    selector: "app-page-campaign",
    templateUrl: 'campaigns-page.component.html',
    styleUrls: ['campaigns-page.component.scss'],
})
export class CampaignsPageComponent implements OnInit {
    @ViewChild('filterMenu') _filterMenu: ElementRef;

    protected getIcon = Utility.instance().getIcon;
    protected findFieldInArray = Utility.instance().findFieldInArray;
    protected statusColor = STATUS_COLOR;

    public items: IDataCampaign[];
    public meta: IMetaPagination | null = null;
    public showDialog = false;
    public selectedCampaign: IDataCampaign | null = null;
    public loading = false;

    public columns: ITableColumnsMeta[] = []

    public sortedRows: IProperty<ISorted> = {};

    public query: IPropertyAny = {};

    public inputAgency: IKeyValueString[];
    public inputAgencyName = '';
    public inputAgencyLoading = false;

    public inputClient: IKeyValueString[];
    public inputClientName: IPropertyString | null;

    public years: IPropertyString[];
    public changeYear: string = '';
    public selectedYear: IPropertyString | null;

    statuses: IKeyValueString[];
    public selectedStatusValue: string;
    public selectedStatusIndex: number;

    public search = ''
    public searchLoading = false;

    constructor(
        protected campaignsService: CampaignsService,
        protected agencyService: AgencyService,
        protected toast: ToastService,
        private route: ActivatedRoute,
        private router: Router,
        private queryService: QueryService
    ) { }

    ngOnInit() {
        this.getCampaigns()
        this.getAutocompleteClient();
        this.getAutocompleteYears();
    }

    async getCampaigns() {
        this.loading = true;

        this.getQueryUrl((query: IPropertyString) => {
            this.campaignsService.apiGetCampaigns(query).subscribe({
                next: (response) => {
                    this.items = response.data;
                    this.columns = response.columns;
                    this.meta = response.meta as IMetaPagination;
                    this.columns = this.queryService.setSortColumns(this.columns, query, PREFIX_SORT);
                    this.searchLoading = false
                    this.statuses = [{ key: 'all', value: 'All' }, ...response.statuses];
                    this.savingFieldsFromUrl(query);
                },
                error: () => {
                    this.loading = false;
                    this.searchLoading = false
                },
                complete: () => {
                    this.loading = false;
                    this.searchLoading = false
                }
            });
        });
    }

    savingFieldsFromUrl(query: IPropertyAny) {
        if (!Object.keys(query).length) { return }

        Object.keys(query).forEach((key: string) => {
            this.query[key] = String(query[key]);

            switch (key) {
                case 'agency': {
                    this.inputAgencyName = String(query[key]);
                    break;
                }
                case 'client': {
                    const item = this.findFieldInArray(this.inputClient, query[key] as string, 'key');
                    this.inputClientName = item as IPropertyString | null;
                    break;
                }
                case 'year': {
                    const item = this.findFieldInArray(this.years, query[key] as string, 'value');
                    this.selectedYear = item as IPropertyString | null;
                    break
                }
                case 'status': {
                    const item: IKeyValueString | null = this.findFieldInArray(this.statuses, query[key] as string, 'key');
                    if (item) {
                        this.selectedStatusIndex = this.statuses.findIndex(s => s.key === item.key);
                        this.selectedStatusValue = item.key;
                    }
                    break
                }
                case 'search': {
                    this.search = String(query[key]);
                }
            }
        });
    }

    actionPagination(data: IPagination) {
        this.query['page'] = data.page;
        this.query['size'] = data.size;
        this.setQueryUrl();
    }

    sortChange(value: string) {
        const sortKey = this.queryService.createSortKey(value, PREFIX_SORT);

        this.sortedRows = this.queryService.getSortItems(this.sortedRows, value, PREFIX_SORT);
        Object.keys(this.sortedRows).forEach(el => {
            const key = this.sortedRows[el].key;
            this.query[key] = this.sortedRows[el].sort;
        })

        if (!this.sortedRows[value]) {
            delete this.query[sortKey]
        }
        this.setQueryUrl();
    }

    getAutocompleteAgency(str: string) {
        if (!str) {
            this.inputAgencyLoading = false
            this.inputAgency = [];
            return;
        }
        this.inputAgencyLoading = true;
        this.agencyService.apiGetAutocomplete(str).subscribe({
            next: res => {
                this.inputAgency = Array.isArray(res) ? res : [];
                this.inputAgencyLoading = false
            },
            error: () => { },
            complete: () => this.inputAgencyLoading = false
        })
    }

    getSomeAgency(name: string) {
        if (name) {
            this.query['agency'] = String(name);
        } else if (this.query['agency']) {
            this.query['agency'] = '';
        }
        this.setQueryUrl()
    }

    filterChangeClient(name: string) {
        if (!name) { return }
        this.getAutocompleteClient({ client: name })
    }

    getAutocompleteClient(data: IPropertyString | null = null) {
        this.campaignsService.apiGetAutocompleteClient(data).subscribe(res => {
            this.inputClient = Array.isArray(res) ? res : [];
        })
    }

    getSomeClient(item: IPropertyString | undefined) {

        if (item) {
            this.query['client'] = String(item['key']);
        } else if (this.query['client']) {
            this.query['client'] = '';
        }
        this.setQueryUrl()
    }

    getAutocompleteYears() {
        this.campaignsService.apiGetCampaignYears().subscribe(res => {
            this.years = res
        })
    }

    filterChangeYears(str: string = '') {
        this.changeYear = str
    }

    getSomeYears(item: IPropertyString | undefined) {
        if (item) {
            this.query['year'] = item['value'];
        } else {
            this.query['year'] = '';
        }
        this.setQueryUrl();
    }


    applyStatus() {
        if (this.selectedStatusValue && this.selectedStatusValue !=='all') {
            this.query['status'] = this.selectedStatusValue;
        } else {
            this.query['status'] = ''
        }
        this.setQueryUrl()
    }

    searchChange(str: string) {
        this.search = str;
        this.searchLoading = true;
        this.query['search'] = str;
        this.setQueryUrl()
    }

    actionDelete(id: string) {
        this.showDialog = true;
        const candidate = this.items.find(item => item.id === id);
        if (!candidate) { return }
        this.selectedCampaign = candidate;
    }
    resetSelectedData() {
        this.showDialog = false;
        this.selectedCampaign = null;
    }

    deleteItem() {
        if (!this.selectedCampaign) { return }
        const { id } = this.selectedCampaign;

        this.campaignsService.apiDeleteCampaign(id).subscribe((res: IresDeleteCampaign) => {
            this.items = this.items.filter(item => item.id !== id);
            this.resetSelectedData();
            this.toast.show(res.message, 'info');
        })
    }

    setQueryUrl() {
        this.router.navigate([], { queryParams: this.clearQuery(this.query) })
    }

    clearQuery(query: IPropertyAny): IPropertyAny {
        const data: IPropertyAny = {}
        Object.keys(query).forEach(key => {
            if (query[key]) {
                data[key] = query[key]
            }
        })
        return data;
    }

    getQueryUrl(calback: Function) {
        this.route.queryParams.subscribe((query: IPropertyString) => {
            calback(query)
        })
    }

    review(id: string) {
        const url = this.router.url.split("?")[0];
        const candidate: any | undefined = this.items.find(item => item.id === id);
        if (!candidate) { return }
        this.router.navigate([`${url}/${id}`])
    }
}