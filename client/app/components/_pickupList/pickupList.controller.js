class PickupListController {

  constructor(Authentication, PickupDate, Store, $filter, $mdDialog, $document) {
    "ngInject";

    Object.assign(this, {
      Authentication,
      PickupDate,
      Store,
      $filter,
      $mdDialog,
      $document
    });

    this.defaultOptions = {
      header: "Pickups",
      showCreateButton: false,
      showDetail: "date",
      showTopbar: true,
      filter: {
        showJoined: false,
        showOpen: true,
        showFull: false
      },
      reversed: false
    };

    this.options = angular.merge(this.defaultOptions, this.options);

    this.userId = -1;

    this.Authentication.update().then((data) => {
      this.userId = data.id;
      this.updatePickups();
    });
  }

    /**
     * adds following infos to a list of pickups:
     * - isUserMember
     * - isFull
     * - store (if showDetail == store)
     */
  addPickuplistInfos(pickups) {
    angular.forEach(pickups, (currentPickup) => {
      currentPickup.isUserMember = currentPickup.collector_ids.indexOf(this.userId) !== -1;
      currentPickup.isFull = !(currentPickup.collector_ids.length < currentPickup.max_collectors);

      if (this.options.showDetail === "store") {
        currentPickup.storePromise = this.Store.get(currentPickup.store);
      }
    });
    this.allPickups = pickups;
    return pickups;
  }

    /*
     * Filters pickups, so that only the ones specified by the criteria in the header menu are shown
     * @return filtered pickups
     */
  filterPickups() {
    let pickups = [];
    angular.forEach(this.allPickups, (currentPickup) => {
      if (currentPickup.isUserMember && this.options.filter.showJoined
        || currentPickup.isFull && this.options.filter.showFull
        || !currentPickup.isFull && this.options.filter.showOpen) {
        pickups.push(currentPickup);
      }
    });
    return pickups;
  }

  /*
   * groups pickups by date
   * @return array with items like: {"date": "yyyy-MM-dd", "items", [pickups]}
   */
  groupByDate(arr){
    let getArrayItem = (date, arr) => {
      for (let i = 0; i < arr.length; i++){
        if (arr[i].date === date){
          return arr[i];
        }
      }
      return undefined;
    };

    let retArr = [];
    angular.forEach(arr, (pickup) => {
      let pickupDay = this.$filter("date")(pickup.date, "yyyy-MM-dd", "");
      let arrayItem = getArrayItem(pickupDay, retArr);
      if (angular.isDefined(arrayItem)){
        arrayItem.items.push(pickup);
      } else {
        retArr.push({ "date": pickupDay, "items": [pickup] });
      }
    });
    return retArr;
  }

  toggleReversed() {
    this.options.reversed = !this.options.reversed;
  }

    /**
     * update function that should be called every time something is changed in the list
     */
  updatePickups() {
    let promise = {};
    if (angular.isDefined(this.groupId)) {
      promise = this.PickupDate.listByGroupId(this.groupId);
    } else if (angular.isDefined(this.storeId)) {
      promise = this.PickupDate.listByStoreId(this.storeId);
    }
    promise.then((data) => this.addInfosAndDisplayPickups(data));
  }

  addInfosAndDisplayPickups(newPickups) {
    newPickups = this.addPickuplistInfos(newPickups);
    newPickups = this.filterPickups(newPickups);
    this.groupedPickups = this.groupByDate(newPickups);
  }

  openCreatePickupPanel($event) {
    let parentEl = this.$document.body;

    let DialogController = function (storeId, pickuplistCtrl) {
      "ngInject";
      this.storeId = storeId;
      this.pickuplistCtrl = pickuplistCtrl;
    };

    this.$mdDialog.show({
      parent: parentEl,
      targetEvent: $event,
      template: `{{storeId}}<create-pickup store-id='$ctrl.storeId'
        pickuplist-ctrl='$ctrl.pickuplistCtrl'></create-pickup>`,
      locals: {
        storeId: this.storeId,
        pickuplistCtrl: this
      },
      controller: DialogController,
      controllerAs: "$ctrl"
    });
  }
}

export default PickupListController;
