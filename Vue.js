/*
 * Vue.js -v 2.6
 * Підключення компонентів із використанням пропсів
 * Сортуровка данних
 */

<template>
  <div class="page_overlay">
    <BreadCrumbs />
    <PageHeader
      :title="organization.name + ' Sweepstakes'"
      :image="organization.image"
    ></PageHeader>
    <div
      class="express_account_wrap"
      :class="
        expressAccountData.loaded && !expressAccountData.isExpressAccConnected
          ? 'active'
          : ''
      "
      :style="
        expressAccountData.loaded && !expressAccountData.isExpressAccConnected
          ? `height: ${expressAccountBlockHeight + 5}px`
          : `height: 0px`
      "
    >
      <section ref="expressAccountBlock">
        <div class="text">
          <p>{{ expressAccountData.message }}</p>
        </div>
        <simpleButtonLoader
          text="Enter Details"
          :loading="loadeExpressAccount"
          @emitClick="getAccountExpress"
        />
      </section>
    </div>

    <SimpleTable
      :headerItems="headerItems"
      :items="items"
      :total="total"
      :numberPages="numberPages"
      :canEdit="canEdit"
      @selectActions="selectActions"
      @selectCount="selectCount"
      @pageSelection="pageSelection"
      @selectMenu="selectMenu"
      @action="action"
      @promote="promote"
    >
      <template #filters v-if="filters.length">
        <Filters
          :items="filters"
          :activeEl="sendingData.statuses"
          @selectFilter="selectFilter"
        ></Filters>
      </template>
      <template #loader>
        <ProgressBar :loading="loading"></ProgressBar>
      </template>
    </SimpleTable>
    <ModalOverlay :showModal="this.modal" @hideModal="hideModal" class="small">
      <div class="copy-modal">
        <h4>Public shareable link</h4>
        <input :value="text" ref="copyInput" :disabled="true" />
        <div class="btn_overlay">
          <button @click.prevent="hideModal" class="btn btn-cancel">
            Cancel
          </button>

          <ImageButton
            class="btn-img"
            :class="saved ? 'btn-green' : 'btn-yellow'"
            :title="saved ? 'Saved' : 'Copy link'"
            imagePosition="left"
            @buttonEmit="copy"
            :disabled="saved"
          >
            <template #imageLeft v-if="!saved">
              <img :src="require(`@/assets/img/copy.svg`)" alt="view" />
            </template>
          </ImageButton>
        </div>
      </div>
    </ModalOverlay>
  </div>
</template>

<script>
        
    import BreadCrumbs from "@/common/BreadCrumbs";
    import PageHeader from "@/common/dashboard/pageHeader.vue";

    import SimpleTable from "@/components/simpleTable";
    import ProgressBar from "@/components/progressBar.vue";
    import Filters from "@/components/filters.vue";

    import ModalOverlay from "@/common/modalOverlay.vue";
    import ImageButton from "@/components/buttons/imageButton.vue";
    import simpleButtonLoader from "@/components/buttons/simpleButtonLoader";

    import { changeCheckboxList } from "@/helpers/scripts";
    import { permissionsCheckEdit } from "@/helpers/routerGuards.js";
    import { mapGetters, mapMutations, mapActions } from "vuex";

    export default {
    name: "organization-sweepstakes",
    components: {
        BreadCrumbs,
        PageHeader,
        SimpleTable,
        ProgressBar,
        Filters,
        ModalOverlay,
        ImageButton,
        simpleButtonLoader,
    },
    data() {
        return {
        sendingData: {
            id: null,
            page: 1,
            per_page: 10,

            focus: "all",
            statuses: "all",

            start_date: "12",
            end_date: "12",

            sort: "title",
            order: "asc",
        },
        sortSelect: {
            sort: "title",
            order: "asc",
        },
            modal: false,
            text: process.env.VUE_APP_UNCOMMONGOOD + "/sweepstakes",
            saved: false,
            stripe: "",
            stripeAPIToken: process.env.VUE_APP_STRIPE_KEY,
            loadeExpressAccount: false,
            expressAccountBlockHeight: 0,
            canEdit: false,
        };
    },
    async created() {
        this.sendingData.id = this.organization.id;

        this.getPermissionForEdit();

        await this.getApiFocuses();
        await this.apiIsExpressAccount(this.organization.id);

        this.headersItemStatus();
        this.headersItemFocuses();

        this.getApiSweepstakes(this.sendingData);
        this.getApiStatuses(this.sendingData);
    },
    watch: {
        expressAccountData(val) {
        if (val.loaded) {
            this.expressAccountBlockHeight =
            this.$refs.expressAccountBlock.clientHeight;
        }
        },
    },
    computed: {
        ...mapGetters("adminpage", {
        organization: "getUserActiveOrganization",
        }),
        ...mapGetters("organizations/sweepstakes", {
        items: "getItems",
        headerItems: "getHeaderItems",
        total: "getTotal",
        loading: "getLoader",
        numberPages: "getNumberPages",
        filters: "getFilterStatuses",
        focusOptionsWithId: "getFocusesWithId",
        expressAccountData: "getExpressAccountData",
        }),
    },
    methods: {
        ...mapActions("organizations/sweepstakes", [
            "getApiFocuses",
            "getApiStatuses",
            "getApiSweepstakes",
            "invitationAction",
            "apiIsExpressAccount",
            "apiСreateAccountExpress",
        ]),
        ...mapMutations("organizations/sweepstakes", [
            "setHeaderItems",
            "setClearData",
        ]),
        getPermissionForEdit() {
        let permission = permissionsCheckEdit("pro.sweepstakes.management-page");
        this.canEdit = permission ? true : false;
        },
        async headersItemStatus() {
        let headers = JSON.parse(JSON.stringify(this.headerItems));
        let payload = await headers.map((el) => {
            let statuses;
            if (el.key === "statuses") {
            statuses = el.menu[0].items.map((element) => {
                element.class =
                element.key == this.sendingData.statuses ? "active" : "";
                return element;
            });
            el.menu[0].items = statuses;
            }
            return el;
        });
        this.setHeaderItems(payload);
        },
        async headersItemFocuses() {
        let focus = JSON.parse(JSON.stringify(this.focusOptionsWithId)),
            headers = JSON.parse(JSON.stringify(this.headerItems));

        let focusItems = await focus.map((el) => {
            let newEl = {
            key: el.id,
            value: el.title,
            class: this.sendingData.focus == el.id ? "active" : "",
            };
            return newEl;
        });

        let payload = await headers.map((el) => {
            el.key === "focus" ? (el.menu[0].items = focusItems) : false;
            return el;
        });
        this.setHeaderItems(payload);
        },

        async selectActions(sortKey) {
        let sort = sortKey === "statuses" ? "statuses_concat" : sortKey;
        this.sendingData.sort = sort;
        let sortSelect = this.sortSelect;
        let data = this.sendingData;

        if (sortSelect.sort === "") {
            this.sortSelect = { sort, order: "desc" };
        } else {
        }

        if (sortSelect.sort === sort) {
            if (sortSelect.order === "asc") {
            this.sortSelect = { ...this.sortSelect, order: "desc" };
            }

            if (sortSelect.order === "desc") {
            this.sortSelect = { ...this.sortSelect, order: "asc" };
            }
        } else {
            this.sortSelect = { sort, order: "asc" };
        }

        data = {
            ...this.sendingData,
            ...this.sortSelect,
        };
        const success = await this.getApiSweepstakes(data);
        if (success) {
            this.sendingData = data;
            this.getApiStatuses(data);
        }
        },
        async selectCount(val) {
        const data = {
            ...this.sendingData,
            page: 1,
            per_page: val,
        };

        const success = await this.getApiSweepstakes(data);
        if (success) {
            this.sendingData = data;
            this.getApiStatuses(data);
        }
        },
        async pageSelection(page) {
        const data = {
            ...this.sendingData,
            page: page,
        };

        const success = await this.getApiSweepstakes(data);
        if (success) {
            this.sendingData = data;
            this.getApiStatuses(data);
        }
        },
        async selectMenu(params) {
        const items = changeCheckboxList(this.headerItems, params);
        this.setHeaderItems(items);

        const data = {
            ...this.sendingData,
            page: 1,
        };
        data[params.name] = params.key;

        const success = await this.getApiSweepstakes(data);
        if (success) {
            this.sendingData = data;
            this.getApiStatuses(data);
            if (params.name === "focus") {
            this.headersItemFocuses();
            } else if (params.name === "statuses") {
            this.headersItemStatus();
            }
        }
        },
        async selectFilter(val) {
        const data = {
            ...this.sendingData,
            page: 1,
            statuses: val,
        };

        const success = await this.getApiSweepstakes(data);
        if (success) {
            this.sendingData = data;
            this.headersItemStatus();
        }
        },
        promote(item) {
            this.text =
                process.env.VUE_APP_UNCOMMONGOOD + "/sweepstakes/" + item.slug;
            this.saved = false;
            this.modal = true;
        },
        hideModal() {
            this.modal = false;
        },
        copy() {
            let copyText = this.$refs.copyInput;
            copyText.select();
            copyText.setSelectionRange(0, 99999);
            document.execCommand("copy");
            this.saved = true;
            },
        action(state) {
            let data = {
                organization: this.sendingData.id,
                sweepstake: state.item.id,
                value: state.value,
            };
            if (state.value === "declined") {
                let text = "Declined";
                this.$swal({
                title:
                    "Are you sure you want to decline this invitation to raise donation with " +
                    state.item.title +
                    "?",
                confirmButtonText: "Yes, I want to decline",
                showCancelButton: true,
                cancelButtonText: "Cancel",
                }).then((result) => {
                if (result.value) {
                    this.invitation(data, text, state.item.title);
                }
                });
            } else if (state.value === "accepted") {
                let text = "Accepted";
                this.invitation(data, text, state.item.title);
            }
        },
        async invitation(data, text, title) {
        let res = await this.invitationAction(data),
            self = this;
        if (res) {
            this.$swal({
            title: "Invitation to ‘" + title + "’ " + text + "!",
            confirmButtonText: "OK",
            }).then(() => {
            self.getApiSweepstakes(this.sendingData);
            });
        }
        },
        async getAccountExpress() {
        const data = {
            organization_id: this.sendingData.id,
            refresh_url: window.location.href,
            return_url: window.location.href,
        };
        this.loadeExpressAccount = true;
        const pageUrl = await this.apiСreateAccountExpress(data);
        this.loadeExpressAccount = false;
        if (pageUrl) {
            document.location.href = pageUrl;
        }
        },
    },
    destroyed() {
        this.setClearData();
    },
    };
</script>
<style lang="scss" scoped>
    @import "@/assets/style/variables.scss";
    .copy-modal {
    max-width: 305px;
    margin: 0 auto;
    h4 {
        font-size: 20px;
        text-align: center;
        font-weight: 900;
        color: $violet;
        margin-bottom: 24px;
    }
    .btn_overlay {
        margin-top: 35px;
        display: flex;
        justify-content: space-between;
        flex-wrap: wrap;
        .btn {
        width: calc(50% - 7px);
        }
        @media only screen and (max-width: 399px) {
        margin-top: 15px;
        .btn {
            width: 100%;
            margin-bottom: 15px;
        }
        }
    }
    }
    input:disabled {
    cursor: text;
    color: #63517a !important;
    }

    .express_account_wrap {
    height: 0;
    opacity: 0;
    overflow: hidden;
    transition: linear all 0.3s;
    &.active {
        opacity: 1;
        transition: linear all 0.3s;
    }
    section {
        padding: 20px;
        border-radius: 10px;
        border: 1px solid #f2eef9;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
    .text {
        color: $red;
        margin: 0 1.5rem;
    }
    }
</style>